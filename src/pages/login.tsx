import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/router";

import type {
  FormEvent,
} from "react";

import {
  ArrowLeft,
  Eye,
  EyeOff,
  Globe,
  LockKeyhole,
  Mail,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  UserCircle,
} from "lucide-react";

import {
  addLoginSecurityRecord,
  clearOTPChallenge,
  createOTPChallenge,
  getCurrentDeviceInfo,
  getCurrentUser,
  getLoginBlockRemaining,
  getLoginTimeTheme,
  getOTPChallenge,
  getOrCreateDeviceId,
  getTrustedDevices,
  isLoginBlocked,
  loginUser,
  resetLoginAttempts,
  trustCurrentDevice,
  verifyOTP,
} from "@/lib/auth";

import {
  getCurrentBackendUser,
  loginWithBackend,
  saveBackendSession,
} from "@/lib/backendAuth";

type LoginStep =
  | "credentials"
  | "otp";

type SecurityInfo = {
  ipAddress: string;
  city: string;
  state: string;
  country: string;
  approximateLocation: string;
};

const UNKNOWN = "Unknown";

const THEME_KEY =
  "youtube_theme_preference";

function normalizeValue(
  value?: string
) {
  return (value || "")
    .trim()
    .toLowerCase();
}

function isKnown(
  value?: string
) {
  return Boolean(
    value &&
      normalizeValue(value) !==
        normalizeValue(UNKNOWN)
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    step,
    setStep,
  ] = useState<LoginStep>(
    "credentials"
  );

  const [
    otp,
    setOtp,
  ] = useState("");

  const [
    demoOtp,
    setDemoOtp,
  ] = useState("");

  const [
    rememberDevice,
    setRememberDevice,
  ] = useState(true);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    blockRemaining,
    setBlockRemaining,
  ] = useState(0);

  const [
    otpCooldown,
    setOtpCooldown,
  ] = useState(0);

  const [
    securityInfo,
    setSecurityInfo,
  ] = useState<SecurityInfo>({
    ipAddress: "Checking...",
    city: "Checking...",
    state: "Checking...",
    country: "Checking...",
    approximateLocation:
      "Checking...",
  });

  const [
    backendToken,
    setBackendToken,
  ] = useState<string | null>(null);

  const [
    backendUser,
    setBackendUser,
  ] = useState<{
    id: string;
    name: string;
    email: string;
    role?: string;
  } | null>(null);

  
useEffect(() => {
  if (!router.isReady) return;

  const queryEmail = router.query.email;

  if (typeof queryEmail === "string" && queryEmail.trim()) {
    setEmail(queryEmail.trim().toLowerCase());
  }
}, [router.isReady, router.query.email]);


  useEffect(() => {
    const updateBlockedTime =
      () => {
        setBlockRemaining(
          getLoginBlockRemaining()
        );
      };

    updateBlockedTime();

    const interval =
      window.setInterval(
        updateBlockedTime,
        1000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, []);

  useEffect(() => {
    if (step !== "otp") {
      setOtpCooldown(0);
      return;
    }

    const updateCooldown =
      () => {
        const challenge =
          getOTPChallenge();

        if (!challenge) {
          setOtpCooldown(0);
          return;
        }

        const remaining =
          Math.max(
            0,
            60 -
              Math.floor(
                (Date.now() -
                  new Date(
                    challenge.createdAt
                  ).getTime()) /
                  1000
              )
          );

        setOtpCooldown(
          remaining
        );
      };

    updateCooldown();

    const interval =
      window.setInterval(
        updateCooldown,
        1000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [step]);

  const clearMessages =
    () => {
      setError("");
      setMessage("");
    };

  const validateEmail =
    (
      value: string
    ) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        value
      );
    };

  const getReturnUrl =
    () => {
      const value =
        router.query.returnUrl;

      if (
        typeof value !== "string"
      ) {
        return "/";
      }

      if (
        !value.startsWith("/") ||
        value.startsWith("//")
      ) {
        return "/";
      }

      return value;
    };

  const fetchSecurityInfo =
    async (): Promise<SecurityInfo> => {
      try {
        const response =
          await fetch(
            "/api/security/device-info",
            {
              method: "GET",
              headers: {
                Accept:
                  "application/json",
              },
            }
          );

        if (!response.ok) {
          throw new Error(
            "Security information request failed."
          );
        }

        const data =
          await response.json();

        const city =
          typeof data?.location
            ?.city === "string"
            ? data.location.city
            : UNKNOWN;

        const state =
          typeof data?.location
            ?.state === "string"
            ? data.location.state
            : UNKNOWN;

        const country =
          typeof data?.location
            ?.country === "string"
            ? data.location.country
            : UNKNOWN;

        const locationParts = [
          city,
          state,
          country,
        ].filter(
          (item) =>
            isKnown(item)
        );

        return {
          ipAddress:
            typeof data?.ipAddress ===
            "string"
              ? data.ipAddress
              : UNKNOWN,
          city,
          state,
          country,
          approximateLocation:
            locationParts.length > 0
              ? locationParts.join(
                  ", "
                )
              : UNKNOWN,
        };
      } catch (
        fetchError
      ) {
        console.error(
          "Security info error:",
          fetchError
        );

        return {
          ipAddress: UNKNOWN,
          city: UNKNOWN,
          state: UNKNOWN,
          country: UNKNOWN,
          approximateLocation:
            UNKNOWN,
        };
      }
    };

  const recordSecurityEvent =
    (
      type:
        | "login"
        | "failed-login"
        | "otp-sent"
        | "otp-success"
        | "otp-failed"
        | "trusted-device",
      success: boolean,
      info: SecurityInfo,
      messageText: string
    ) => {
      const deviceInfo =
        getCurrentDeviceInfo();

      addLoginSecurityRecord({
        email:
          email
            .trim()
            .toLowerCase(),
        type,
        successful: success,
        deviceId:
          deviceInfo.deviceId ||
          getOrCreateDeviceId(),
        ipAddress:
          info.ipAddress,
        browser:
          deviceInfo.browser,
        browserVersion:
          deviceInfo.browserVersion,
        operatingSystem:
          deviceInfo.operatingSystem,
        deviceType:
          deviceInfo.deviceType,
        deviceModel:
          deviceInfo.deviceModel,
        city: info.city,
        state: info.state,
        country: info.country,
        approximateLocation:
          info.approximateLocation,
        message:
          messageText,
      });
    };

  const isSameSecurityEnvironment =
    (
      userEmail: string,
      info: SecurityInfo
    ) => {
      const deviceInfo =
        getCurrentDeviceInfo();

      const deviceId =
        deviceInfo.deviceId ||
        getOrCreateDeviceId();

      const trustedDevices =
        getTrustedDevices(
          userEmail
        );

      return trustedDevices.some(
        (device) => {
          if (
            device.deviceId !==
            deviceId
          ) {
            return false;
          }

          if (
            isKnown(
              device.browser
            ) &&
            isKnown(
              deviceInfo.browser
            ) &&
            normalizeValue(
              device.browser
            ) !==
              normalizeValue(
                deviceInfo.browser
              )
          ) {
            return false;
          }

          if (
            isKnown(
              device.operatingSystem
            ) &&
            isKnown(
              deviceInfo.operatingSystem
            ) &&
            normalizeValue(
              device.operatingSystem
            ) !==
              normalizeValue(
                deviceInfo.operatingSystem
              )
          ) {
            return false;
          }

          if (
            isKnown(
              device.ipAddress
            ) &&
            isKnown(
              info.ipAddress
            ) &&
            normalizeValue(
              device.ipAddress
            ) !==
              normalizeValue(
                info.ipAddress
              )
          ) {
            return false;
          }

          if (
            isKnown(
              device.city
            ) &&
            isKnown(
              info.city
            ) &&
            normalizeValue(
              device.city
            ) !==
              normalizeValue(
                info.city
              )
          ) {
            return false;
          }

          if (
            isKnown(
              device.state
            ) &&
            isKnown(
              info.state
            ) &&
            normalizeValue(
              device.state
            ) !==
              normalizeValue(
                info.state
              )
          ) {
            return false;
          }

          return true;
        }
      );
    };

  const applyLoginTheme =
    () => {
      if (
        typeof window ===
        "undefined"
      ) {
        return "dark";
      }

      const theme =
        getLoginTimeTheme();

      localStorage.setItem(
        THEME_KEY,
        theme
      );

      document.documentElement.classList.toggle(
        "dark",
        theme === "dark"
      );

      document.documentElement.dataset.theme =
        theme;

      window.dispatchEvent(
        new CustomEvent(
          "youtube-theme-change",
          {
            detail: theme,
          }
        )
      );

      return theme;
    };

  const completeLogin =
    async (
      userEmail: string,
      info: SecurityInfo
    ) => {
      if (
        !backendToken ||
        !backendUser
      ) {
        setError(
          "Authentication session is missing. Please sign in again."
        );

        return;
      }

      const deviceInfo =
        getCurrentDeviceInfo();

      const deviceId =
        deviceInfo.deviceId ||
        getOrCreateDeviceId();

      resetLoginAttempts();

      const theme =
        applyLoginTheme();

      saveBackendSession(
        backendToken,
        backendUser
      );

      loginUser(
        {
          name:
            backendUser.name ||
            userEmail
              .split("@")[0],
          email:
            backendUser.email ||
            userEmail,
        },
        {
          deviceId,
          ipAddress:
            info.ipAddress,
          browser:
            deviceInfo.browser,
          browserVersion:
            deviceInfo.browserVersion,
          operatingSystem:
            deviceInfo.operatingSystem,
          deviceType:
            deviceInfo.deviceType,
          deviceModel:
            deviceInfo.deviceModel,
          city: info.city,
          state: info.state,
          country: info.country,
          approximateLocation:
            info.approximateLocation,
        }
      );

      setMessage(
        `Login successful. ${
          theme === "light"
            ? "Light"
            : "Dark"
        } theme selected.`
      );

      setOtp("");
      setDemoOtp("");
      clearOTPChallenge();

      await new Promise(
        (resolve) =>
          window.setTimeout(
            resolve,
            250
          )
      );

      await router.push(
        getReturnUrl()
      );
    };

  const handleCredentialsSubmit =
    async (
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      clearMessages();

      if (isLoginBlocked()) {
        const remaining =
          getLoginBlockRemaining();

        setBlockRemaining(
          remaining
        );

        setError(
          "Too many failed login attempts. Please wait before trying again."
        );

        return;
      }

      const normalizedEmail =
        email
          .trim()
          .toLowerCase();

      if (!normalizedEmail) {
        setError(
          "Please enter your email."
        );
        return;
      }

      if (
        !validateEmail(
          normalizedEmail
        )
      ) {
        setError(
          "Please enter a valid email address."
        );
        return;
      }

      if (!password.trim()) {
        setError(
          "Please enter your password."
        );
        return;
      }

      setLoading(true);

      try {
        /*
         * REAL BACKEND LOGIN
         *
         * This verifies email + password
         * against MongoDB through Express.
         */
        const result =
          await loginWithBackend(
            normalizedEmail,
            password
          );

        if (!result.success) {
          setError(
            result.message ||
              "Invalid email or password."
          );

          return;
        }

        if (
          !result.token ||
          !result.user
        ) {
          setError(
            "Login response is missing authentication data."
          );

          return;
        }

        setBackendToken(
          result.token
        );

        setBackendUser(
          result.user
        );

        setEmail(
          normalizedEmail
        );

        const info =
          await fetchSecurityInfo();

        setSecurityInfo(
          info
        );

        const deviceInfo =
          getCurrentDeviceInfo();

        const deviceId =
          deviceInfo.deviceId ||
          getOrCreateDeviceId();

        recordSecurityEvent(
          "login",
          true,
          info,
          "Backend credentials verified successfully."
        );

        const trusted =
          isSameSecurityEnvironment(
            normalizedEmail,
            info
          );

        if (trusted) {
          await completeLogin(
            normalizedEmail,
            info
          );

          return;
        }

        recordSecurityEvent(
          "otp-sent",
          false,
          info,
          "OTP required because the security environment is new or changed."
        );

        const challenge =
          createOTPChallenge(
            normalizedEmail,
            "login"
          );

        if (!challenge) {
          setError(
            "Unable to create an OTP challenge. Please try again."
          );

          return;
        }

        setDemoOtp(
          challenge.code
        );

        setOtp("");

        setOtpCooldown(60);

        setStep("otp");

        setMessage(
          "Credentials verified. This is a new security environment, so OTP verification is required."
        );

        void deviceId;
      } catch (loginError) {
        console.error(
          "Login error:",
          loginError
        );

        recordSecurityEvent(
          "failed-login",
          false,
          securityInfo,
          "Unexpected login error."
        );

        setError(
          "Unable to complete login. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

  const handleOTPSubmit =
    async (
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      clearMessages();

      const normalizedEmail =
        email
          .trim()
          .toLowerCase();

      if (
        otp.trim().length !== 6
      ) {
        recordSecurityEvent(
          "otp-failed",
          false,
          securityInfo,
          "OTP must contain 6 digits."
        );

        setError(
          "Please enter the 6-digit OTP."
        );

        return;
      }

      const challenge =
        getOTPChallenge();

      if (!challenge) {
        recordSecurityEvent(
          "otp-failed",
          false,
          securityInfo,
          "OTP expired or missing."
        );

        setError(
          "OTP expired. Please request a new OTP."
        );

        return;
      }

      if (
        challenge.email !==
        normalizedEmail
      ) {
        recordSecurityEvent(
          "otp-failed",
          false,
          securityInfo,
          "OTP belongs to a different account."
        );

        setError(
          "This OTP does not belong to the current login."
        );

        return;
      }

      setLoading(true);

      try {
        const result =
          verifyOTP(
            normalizedEmail,
            otp
          );

        if (!result.success) {
          recordSecurityEvent(
            "otp-failed",
            false,
            securityInfo,
            result.reason
          );

          setError(
            result.reason
          );

          return;
        }

        recordSecurityEvent(
          "otp-success",
          true,
          securityInfo,
          "OTP verified successfully."
        );

        const deviceInfo =
          getCurrentDeviceInfo();

        if (
          rememberDevice
        ) {
          trustCurrentDevice(
            normalizedEmail,
            {
              deviceId:
                deviceInfo.deviceId ||
                getOrCreateDeviceId(),
              ipAddress:
                securityInfo.ipAddress,
              browser:
                deviceInfo.browser,
              browserVersion:
                deviceInfo.browserVersion,
              operatingSystem:
                deviceInfo.operatingSystem,
              deviceType:
                deviceInfo.deviceType,
              deviceModel:
                deviceInfo.deviceModel,
              city:
                securityInfo.city,
              state:
                securityInfo.state,
              country:
                securityInfo.country,
              approximateLocation:
                securityInfo.approximateLocation,
            }
          );

          recordSecurityEvent(
            "trusted-device",
            true,
            securityInfo,
            "Current device was marked as trusted."
          );
        }

        await completeLogin(
          normalizedEmail,
          securityInfo
        );
      } catch (
        otpError
      ) {
        console.error(
          "OTP verification error:",
          otpError
        );

        recordSecurityEvent(
          "otp-failed",
          false,
          securityInfo,
          "Unexpected OTP verification error."
        );

        setError(
          "Unable to verify the OTP."
        );
      } finally {
        setLoading(false);
      }
    };

  const handleResendOTP =
    async () => {
      clearMessages();

      if (otpCooldown > 0) {
        setError(
          `Please wait ${otpCooldown} seconds before requesting another OTP.`
        );

        return;
      }

      const normalizedEmail =
        email
          .trim()
          .toLowerCase();

      if (
        !validateEmail(
          normalizedEmail
        )
      ) {
        setError(
          "Please enter a valid email address."
        );

        return;
      }

      setLoading(true);

      try {
        const info =
          await fetchSecurityInfo();

        setSecurityInfo(
          info
        );

        const challenge =
          createOTPChallenge(
            normalizedEmail,
            "login"
          );

        if (!challenge) {
          setError(
            "Unable to create a new OTP."
          );

          return;
        }

        setDemoOtp(
          challenge.code
        );

        setOtp("");

        setOtpCooldown(60);

        recordSecurityEvent(
          "otp-sent",
          false,
          info,
          "A new OTP was generated."
        );

        setMessage(
          "A new OTP has been generated."
        );
      } catch (
        resendError
      ) {
        console.error(
          "OTP resend error:",
          resendError
        );

        setError(
          "Unable to generate a new OTP."
        );
      } finally {
        setLoading(false);
      }
    };

  const handleBack =
    () => {
      clearOTPChallenge();

      setOtp("");

      setDemoOtp("");

      setBackendToken(
        null
      );

      setBackendUser(
        null
      );

      setStep(
        "credentials"
      );

      clearMessages();
    };

  const blockMessage =
    blockRemaining > 0
      ? `Try again in ${Math.ceil(
          blockRemaining / 60
        )} minute(s).`
      : "";

  const deviceInfo =
    getCurrentDeviceInfo();

  return (
    <main
      className={`flex min-h-screen items-center justify-center px-4 py-8 transition ${
        step === "otp"
          ? "bg-gray-100"
          : "bg-gray-50"
      }`}
    >
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={() =>
            void router.push("/")
          }
          className="mb-6 flex items-center gap-2 text-sm text-gray-600 hover:text-black"
        >
          <ArrowLeft
            size={18}
          />
          Back to Home
        </button>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex justify-center">
            <div className="flex h-12 w-16 items-center justify-center rounded-xl bg-red-600">
              <span className="text-xl font-bold text-white">
                ▶
              </span>
            </div>
          </div>

          <h1 className="mt-5 text-center text-2xl font-bold">
            {step ===
            "credentials"
              ? "Sign in"
              : "Verify your device"}
          </h1>

          <p className="mt-2 text-center text-sm leading-5 text-gray-500">
            {step ===
            "credentials"
              ? "Sign in to continue to YouTube Clone."
              : "A security change was detected. Verify your identity to continue."}
          </p>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p>
                {error}
              </p>

              {blockMessage && (
                <p className="mt-1 text-xs">
                  {blockMessage}
                </p>
              )}
            </div>
          )}

          {message && (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          {step ===
          "credentials" ? (
            <form
              onSubmit={
                handleCredentialsSubmit
              }
              className="mt-8 space-y-5"
            >
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium"
                >
                  Email
                </label>

                <div className="flex items-center rounded-xl border border-gray-300 px-3 focus-within:border-blue-500">
                  <Mail
                    size={19}
                    className="shrink-0 text-gray-400"
                  />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    disabled={
                      loading
                    }
                    onChange={(
                      event
                    ) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    placeholder="Enter your email"
                    className="h-12 w-full bg-transparent px-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium"
                >
                  Password
                </label>

                <div className="flex items-center rounded-xl border border-gray-300 px-3 focus-within:border-blue-500">
                  <LockKeyhole
                    size={19}
                    className="shrink-0 text-gray-400"
                  />

                  <input
                    id="password"
                    name="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="current-password"
                    value={
                      password
                    }
                    disabled={
                      loading
                    }
                    onChange={(
                      event
                    ) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    placeholder="Enter your password"
                    className="h-12 w-full bg-transparent px-3 text-sm outline-none"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (
                          previous
                        ) =>
                          !previous
                      )
                    }
                    className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff
                        size={19}
                      />
                    ) : (
                      <Eye
                        size={19}
                      />
                    )}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    size={21}
                    className="mt-0.5 shrink-0 text-gray-600"
                  />

                  <div>
                    <p className="text-sm font-semibold">
                      Security check
                    </p>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Your device, browser, IP address and approximate location are checked during login.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  loading ||
                  blockRemaining >
                    0
                }
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {loading ? (
                  <>
                    <RefreshCw
                      size={18}
                      className="animate-spin"
                    />
                    Checking credentials...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>
          ) : (
            <form
              onSubmit={
                handleOTPSubmit
              }
              className="mt-8 space-y-5"
            >
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="flex items-start gap-3">
                  <Smartphone
                    size={21}
                    className="mt-0.5 shrink-0"
                  />

                  <div>
                    <p className="text-sm font-semibold">
                      New security environment
                    </p>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      {deviceInfo.browser ||
                        UNKNOWN}
                      {" • "}
                      {deviceInfo.operatingSystem ||
                        UNKNOWN}
                      {" • "}
                      {deviceInfo.deviceType ||
                        "Desktop"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center gap-2">
                    <Globe
                      size={15}
                    />

                    <span className="text-xs font-semibold">
                      IP address
                    </span>
                  </div>

                  <p className="mt-2 break-all text-xs text-gray-500">
                    {
                      securityInfo.ipAddress
                    }
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center gap-2">
                    <MapPin
                      size={15}
                    />

                    <span className="text-xs font-semibold">
                      Location
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    {
                      securityInfo.approximateLocation
                    }
                  </p>
                </div>
              </div>

              {demoOtp && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-center text-xs font-semibold text-blue-800">
                    Demo OTP
                  </p>

                  <p className="mt-3 text-center text-3xl font-bold tracking-[0.35em] text-blue-900">
                    {demoOtp}
                  </p>

                  <p className="mt-2 text-center text-xs leading-5 text-blue-700">
                    This OTP is displayed only for the frontend demo. A production app should deliver it through a server-side service.
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="otp"
                  className="mb-2 block text-sm font-medium"
                >
                  Verification code
                </label>

                <input
                  id="otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  disabled={
                    loading
                  }
                  onChange={(
                    event
                  ) =>
                    setOtp(
                      event.target.value.replace(
                        /\D/g,
                        ""
                      )
                    )
                  }
                  placeholder="Enter 6-digit OTP"
                  className="h-12 w-full rounded-xl border border-gray-300 px-4 text-center text-lg tracking-[0.35em] outline-none focus:border-blue-500"
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4">
                <input
                  type="checkbox"
                  checked={
                    rememberDevice
                  }
                  disabled={
                    loading
                  }
                  onChange={(
                    event
                  ) =>
                    setRememberDevice(
                      event.target.checked
                    )
                  }
                  className="mt-1 h-4 w-4"
                />

                <span>
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck
                      size={17}
                    />
                    Trust this device
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-gray-500">
                    This security environment will not repeatedly ask for OTP while the trusted-device period is active.
                  </span>
                </span>
              </label>

              <button
                type="submit"
                disabled={
                  loading ||
                  otp.length !==
                    6
                }
                className="flex h-12 w-full items-center justify-center rounded-full bg-black text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {loading
                  ? "Verifying..."
                  : "Verify device"}
              </button>

              <button
                type="button"
                onClick={
                  handleResendOTP
                }
                disabled={
                  loading ||
                  otpCooldown >
                    0
                }
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gray-100 py-3 text-sm font-medium hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                />

                {otpCooldown >
                0
                  ? `Resend in ${otpCooldown}s`
                  : "Resend OTP"}
              </button>

              <button
                type="button"
                onClick={
                  handleBack
                }
                disabled={
                  loading
                }
                className="w-full rounded-full py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-black"
              >
                Use another account
              </button>
            </form>
          )}

          <div className="mt-6 rounded-2xl bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <UserCircle
                size={22}
                className="mt-0.5 shrink-0 text-gray-500"
              />

              <div>
                <p className="text-sm font-semibold">
                  Backend authentication
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Your email and password are verified by the YouTube Clone backend before the security verification step.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() =>
                void router.push(
                  "/signup"
                )
              }
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              Create account
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}