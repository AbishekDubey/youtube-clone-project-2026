import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/router";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Globe,
  Laptop,
  LogOut,
  MapPin,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Tablet,
  Trash2,
  UserCircle,
} from "lucide-react";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

import {
  clearCurrentSession,
  getCurrentDeviceInfo,
  getCurrentUser,
  getLoginSecurityRecords,
  getLoginSession,
  getTrustedDevices,
  removeAllTrustedDevices,
  revokeTrustedDevice,
  type LoginSecurityRecord,
  type TrustedDevice,
} from "@/lib/auth";

function formatDate(
  value: string
) {
  const timestamp =
    new Date(value);

  if (
    Number.isNaN(
      timestamp.getTime()
    )
  ) {
    return "Unknown";
  }

  return timestamp.toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}

function getEventLabel(
  type: LoginSecurityRecord["type"]
) {
  switch (type) {
    case "login":
      return "Login";

    case "failed-login":
      return "Failed login";

    case "otp-sent":
      return "OTP requested";

    case "otp-success":
      return "OTP verified";

    case "otp-failed":
      return "OTP failed";

    case "trusted-device":
      return "Trusted device";

    default:
      return "Security event";
  }
}

function getEventIcon(
  type: LoginSecurityRecord["type"]
) {
  switch (type) {
    case "login":
    case "otp-success":
    case "trusted-device":
      return (
        <CheckCircle2
          size={18}
        />
      );

    case "failed-login":
    case "otp-failed":
      return (
        <AlertTriangle
          size={18}
        />
      );

    default:
      return (
        <ShieldCheck
          size={18}
        />
      );
  }
}

function getDeviceIcon(
  device: TrustedDevice
) {
  if (
    device.deviceType ===
    "Mobile"
  ) {
    return (
      <Smartphone
        size={22}
      />
    );
  }

  if (
    device.deviceType ===
    "Tablet"
  ) {
    return (
      <Tablet
        size={22}
      />
    );
  }

  return (
    <Monitor
      size={22}
    />
  );
}

function getDeviceLabel(
  device: TrustedDevice
) {
  const parts = [
    device.browser,
    device.operatingSystem,
  ].filter(Boolean);

  if (
    parts.length > 0
  ) {
    return parts.join(" • ");
  }

  return (
    device.deviceName ||
    "Unknown device"
  );
}

function isCurrentDevice(
  device: TrustedDevice
) {
  const current =
    getCurrentDeviceInfo();

  return (
    device.deviceId ===
    current.deviceId
  );
}

export default function SecurityPage() {
  const router =
    useRouter();

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const [
    userEmail,
    setUserEmail,
  ] = useState("");

  const [
    securityRecords,
    setSecurityRecords,
  ] = useState<
    LoginSecurityRecord[]
  >([]);

  const [
    trustedDevices,
    setTrustedDevices,
  ] = useState<
    TrustedDevice[]
  >([]);

  const [
    sessionInfo,
    setSessionInfo,
  ] = useState<
    ReturnType<
      typeof getLoginSession
    >
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionMessage,
    setActionMessage,
  ] = useState("");

  const [
    actionError,
    setActionError,
  ] = useState("");

  const currentDeviceId =
    useMemo(
      () =>
        getCurrentDeviceInfo()
          .deviceId,
      []
    );

  const loadSecurityData =
    () => {
      const user =
        getCurrentUser();

      if (!user) {
        void router.replace(
          `/login?returnUrl=${encodeURIComponent(
            "/security"
          )}`
        );

        return;
      }

      setUserEmail(
        user.email
      );

      setSecurityRecords(
        getLoginSecurityRecords(
          user.email
        )
      );

      setTrustedDevices(
        getTrustedDevices(
          user.email
        )
      );

      setSessionInfo(
        getLoginSession()
      );

      setLoading(false);
    };

  useEffect(() => {
    if (
      !router.isReady
    ) {
      return;
    }

    loadSecurityData();
  }, [
    router.isReady,
    router,
  ]);

  const clearMessages =
    () => {
      setActionMessage("");
      setActionError("");
    };

  const handleRefresh =
    () => {
      clearMessages();
      loadSecurityData();

      setActionMessage(
        "Security information refreshed."
      );
    };

  const handleRevoke =
    (
      device: TrustedDevice
    ) => {
      clearMessages();

      if (!userEmail) {
        return;
      }

      const isCurrent =
        isCurrentDevice(
          device
        );

      const confirmed =
        window.confirm(
          isCurrent
            ? "Remove this device from trusted devices and sign out?"
            : `Remove ${device.deviceName} from trusted devices?`
        );

      if (
        !confirmed
      ) {
        return;
      }

      const revoked =
        revokeTrustedDevice(
          userEmail,
          device.deviceId
        );

      if (!revoked) {
        setActionError(
          "Unable to remove the trusted device."
        );

        return;
      }

      if (
        isCurrent
      ) {
        clearCurrentSession();

        void router.push(
          "/login"
        );

        return;
      }

      setTrustedDevices(
        getTrustedDevices(
          userEmail
        )
      );

      setSecurityRecords(
        getLoginSecurityRecords(
          userEmail
        )
      );

      setActionMessage(
        "Trusted device removed successfully."
      );
    };

  const handleRemoveAll =
    () => {
      clearMessages();

      if (
        !userEmail
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "Remove every trusted device? You will need OTP verification again on the next login."
        );

      if (
        !confirmed
      ) {
        return;
      }

      removeAllTrustedDevices(
        userEmail
      );

      setTrustedDevices(
        []
      );

      setSecurityRecords(
        getLoginSecurityRecords(
          userEmail
        )
      );

      setActionMessage(
        "All trusted devices have been removed."
      );
    };

  const handleSignOut =
    () => {
      clearCurrentSession();

      void router.push(
        "/login"
      );
    };

  if (
    loading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 text-black">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <RefreshCw
            size={20}
            className="animate-spin"
          />
          Loading security information...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-black">
      <Header
        onMenuClick={() =>
          setSidebarOpen(
            true
          )
        }
      />

      <Sidebar
        isOpen={
          sidebarOpen
        }
        onClose={() =>
          setSidebarOpen(
            false
          )
        }
      />

      <div className="lg:ml-64">
        <section className="mx-auto max-w-6xl px-4 pb-24 pt-24 sm:px-6 lg:px-8 lg:pb-10">
          {/* Header */}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <button
                type="button"
                onClick={() =>
                  void router.back()
                }
                className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-black"
              >
                <ArrowLeft
                  size={17}
                />
                Back
              </button>

              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
                  <ShieldCheck
                    size={24}
                  />
                </div>

                <div>
                  <h1 className="text-2xl font-bold">
                    Account security
                  </h1>

                  <p className="mt-1 text-sm text-gray-500">
                    Review your login activity and trusted devices.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={
                handleRefresh
              }
              className="flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-sm ring-1 ring-gray-200 hover:bg-gray-100"
            >
              <RefreshCw
                size={17}
              />
              Refresh
            </button>
          </div>

          {actionMessage && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <CheckCircle2
                size={18}
                className="mt-0.5 shrink-0"
              />

              <span>
                {
                  actionMessage
                }
              </span>
            </div>
          )}

          {actionError && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle
                size={18}
                className="mt-0.5 shrink-0"
              />

              <span>
                {actionError}
              </span>
            </div>
          )}

          {/* Current session */}
          <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <UserCircle
                    size={26}
                  />

                  <h2 className="text-lg font-bold">
                    Current session
                  </h2>
                </div>

                <p className="mt-2 text-sm text-gray-500">
                  {userEmail}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  handleSignOut
                }
                className="flex w-fit items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <LogOut
                  size={17}
                />
                Sign out
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <InfoCard
                icon={
                  <Clock3
                    size={17}
                  />
                }
                label="Login time"
                value={
                  sessionInfo
                    ? formatDate(
                        sessionInfo.loginAt
                      )
                    : "Unknown"
                }
              />

              <InfoCard
                icon={
                  <Laptop
                    size={17}
                  />
                }
                label="Browser"
                value={
                  sessionInfo?.browser ||
                  "Unknown"
                }
              />

              <InfoCard
                icon={
                  <Globe
                    size={17}
                  />
                }
                label="IP address"
                value={
                  sessionInfo?.ipAddress ||
                  "Unknown"
                }
              />

              <InfoCard
                icon={
                  <MapPin
                    size={17}
                  />
                }
                label="Location"
                value={
                  sessionInfo
                    ?.approximateLocation ||
                  "Unknown"
                }
              />
            </div>
          </section>

          {/* Trusted devices */}
          <section className="mt-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  Trusted devices
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Devices that can sign in without repeated OTP verification.
                </p>
              </div>

              {trustedDevices.length >
                0 && (
                <button
                  type="button"
                  onClick={
                    handleRemoveAll
                  }
                  className="flex w-fit items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2
                    size={16}
                  />
                  Remove all
                </button>
              )}
            </div>

            <div className="mt-5 space-y-4">
              {trustedDevices.length >
              0 ? (
                trustedDevices.map(
                  (
                    device
                  ) => {
                    const current =
                      device.deviceId ===
                      currentDeviceId;

                    return (
                      <article
                        key={
                          device.id
                        }
                        className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
                      >
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex min-w-0 gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100">
                              {getDeviceIcon(
                                device
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold">
                                  {
                                    device.deviceName
                                  }
                                </h3>

                                {current && (
                                  <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-bold text-green-700">
                                    CURRENT
                                  </span>
                                )}

                                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                                  TRUSTED
                                </span>
                              </div>

                              <p className="mt-1 text-xs text-gray-500">
                                {getDeviceLabel(
                                  device
                                )}
                              </p>

                              <div className="mt-4 grid gap-2 text-xs text-gray-500 sm:grid-cols-2">
                                <SecurityDetail
                                  icon={
                                    <Globe
                                      size={14}
                                    />
                                  }
                                  label="IP"
                                  value={
                                    device.ipAddress ||
                                    "Unknown"
                                  }
                                />

                                <SecurityDetail
                                  icon={
                                    <MapPin
                                      size={14}
                                    />
                                  }
                                  label="Location"
                                  value={[
                                    device.city,
                                    device.state,
                                    device.country,
                                  ]
                                    .filter(
                                      Boolean
                                    )
                                    .join(
                                      ", "
                                    ) ||
                                    "Unknown"
                                  }
                                />

                                <SecurityDetail
                                  icon={
                                    <Clock3
                                      size={14}
                                    />
                                  }
                                  label="Trusted since"
                                  value={formatDate(
                                    device.trustedAt
                                  )}
                                />

                                <SecurityDetail
                                  icon={
                                    <Clock3
                                      size={14}
                                    />
                                  }
                                  label="Trust expires"
                                  value={formatDate(
                                    device.expiresAt
                                  )}
                                />
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleRevoke(
                                device
                              )
                            }
                            className="flex w-fit items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                          >
                            <LogOut
                              size={16}
                            />
                            {current
                              ? "Sign out"
                              : "Remove"}
                          </button>
                        </div>
                      </article>
                    );
                  }
                )
              ) : (
                <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center">
                  <ShieldCheck
                    size={42}
                    className="mx-auto text-gray-300"
                  />

                  <p className="mt-4 font-semibold">
                    No trusted devices
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    A device becomes trusted after successful OTP verification when the trust option is enabled.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Login history */}
          <section className="mt-8">
            <div>
              <h2 className="text-xl font-bold">
                Login & security history
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Recent authentication and OTP activity for your account.
              </p>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
              {securityRecords.length >
              0 ? (
                <div className="divide-y divide-gray-100">
                  {securityRecords.map(
                    (
                      record
                    ) => (
                      <article
                        key={
                          record.id
                        }
                        className="p-5"
                      >
                        <div className="flex gap-4">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                              record.successful
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-600"
                            }`}
                          >
                            {getEventIcon(
                              record.type
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-semibold">
                                  {getEventLabel(
                                    record.type
                                  )}
                                </h3>

                                <span
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                    record.successful
                                      ? "bg-green-50 text-green-700"
                                      : "bg-red-50 text-red-600"
                                  }`}
                                >
                                  {record.successful
                                    ? "SUCCESS"
                                    : "ATTENTION"}
                                </span>
                              </div>

                              <span className="text-xs text-gray-400">
                                {formatDate(
                                  record.timestamp
                                )}
                              </span>
                            </div>

                            <p className="mt-2 text-sm text-gray-600">
                              {
                                record.message
                              }
                            </p>

                            <div className="mt-3 grid gap-2 text-xs text-gray-500 sm:grid-cols-2 lg:grid-cols-4">
                              <SecurityDetail
                                icon={
                                  <Laptop
                                    size={14}
                                  />
                                }
                                label="Browser"
                                value={[
                                  record.browser,
                                  record.browserVersion,
                                ]
                                  .filter(
                                    Boolean
                                  )
                                  .join(
                                    " "
                                  ) ||
                                  "Unknown"}
                              />

                              <SecurityDetail
                                icon={
                                  <Monitor
                                    size={14}
                                  />
                                }
                                label="Device"
                                value={[
                                  record.deviceType,
                                  record.deviceModel,
                                ]
                                  .filter(
                                    Boolean
                                  )
                                  .join(
                                    " • "
                                  ) ||
                                  "Unknown"}
                              />

                              <SecurityDetail
                                icon={
                                  <Globe
                                    size={14}
                                  />
                                }
                                label="IP"
                                value={
                                  record.ipAddress ||
                                  "Unknown"
                                }
                              />

                              <SecurityDetail
                                icon={
                                  <MapPin
                                    size={14}
                                  />
                                }
                                label="Location"
                                value={
                                  record.approximateLocation ||
                                  [
                                    record.city,
                                    record.state,
                                    record.country,
                                  ]
                                    .filter(
                                      Boolean
                                    )
                                    .join(
                                      ", "
                                    ) ||
                                  "Unknown"
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  )}
                </div>
              ) : (
                <div className="p-10 text-center">
                  <Clock3
                    size={40}
                    className="mx-auto text-gray-300"
                  />

                  <p className="mt-4 font-semibold">
                    No security history
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Login and verification activity will appear here.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Security notice */}
          <section className="mt-8 rounded-3xl border border-yellow-200 bg-yellow-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={20}
                className="mt-0.5 shrink-0 text-yellow-700"
              />

              <div>
                <h2 className="text-sm font-bold text-yellow-900">
                  Security information
                </h2>

                <p className="mt-1 text-xs leading-5 text-yellow-800">
                  This project currently stores security/session data locally for the internship demo. A production system should move authentication, OTP secrets, trusted-device records and audit logs to a secure server/database and should never rely on browser storage as the authoritative security layer.
                </p>
              </div>
            </div>
          </section>
        </section>
      </div>

      <MobileNav />
    </main>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <div className="flex items-center gap-2 text-gray-500">
        {icon}

        <span className="text-xs font-medium">
          {label}
        </span>
      </div>

      <p className="mt-2 break-words text-sm font-semibold text-gray-800">
        {value}
      </p>
    </div>
  );
}

function SecurityDetail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 shrink-0 text-gray-400">
        {icon}
      </span>

      <span className="min-w-0">
        <span className="font-medium text-gray-400">
          {label}:
        </span>{" "}
        <span className="break-words">
          {value}
        </span>
      </span>
    </div>
  );
}