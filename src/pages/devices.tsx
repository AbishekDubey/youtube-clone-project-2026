import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/router";

import {
  Smartphone,
  Monitor,
  Tablet,
  LogOut,
  ShieldCheck,
  MapPin,
  Globe,
  Clock3,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import Header from "@/components/Header";

import {
  getCurrentUser,
  logoutUser,
} from "@/lib/auth";

import {
  getUserDevices,
  revokeTrustedDevice,
  type DeviceInfo,
} from "@/lib/deviceStorage";

export default function DevicesPage() {
  const router =
    useRouter();

  const [devices, setDevices] =
    useState<DeviceInfo[]>(
      []
    );

  const [userEmail, setUserEmail] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [actionDeviceId, setActionDeviceId] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const user =
      getCurrentUser();

    if (!user) {
      router.replace(
        `/login?returnUrl=${encodeURIComponent(
          "/devices"
        )}`
      );

      return;
    }

    setUserEmail(
      user.email
    );

    loadDevices(
      user.email
    );
  }, [
    router.isReady,
    router,
  ]);

  const loadDevices =
    (
      email: string,
      showRefresh = false
    ) => {
      if (showRefresh) {
        setRefreshing(
          true
        );
      } else {
        setLoading(
          true
        );
      }

      setError("");

      try {
        const userDevices =
          getUserDevices(
            email
          );

        setDevices(
          userDevices
        );
      } catch (err) {
        console.error(
          "Failed to load devices:",
          err
        );

        setError(
          "Unable to load your devices."
        );
      } finally {
        setLoading(
          false
        );

        setRefreshing(
          false
        );
      }
    };

  const handleRefresh =
    () => {
      if (!userEmail) {
        return;
      }

      setSuccess("");

      loadDevices(
        userEmail,
        true
      );
    };

  const handleLogoutDevice =
    (
      device: DeviceInfo
    ) => {
      setError("");
      setSuccess("");

      const actionText =
        device.current
          ? "sign out of this device"
          : "remove this device";

      const confirmed =
        window.confirm(
          `Are you sure you want to ${actionText}?\n\n${device.deviceName}`
        );

      if (!confirmed) {
        return;
      }

      setActionDeviceId(
        device.id
      );

      try {
        revokeTrustedDevice(
          userEmail,
          device.id
        );

        /*
         * Current device:
         * remove device + clear current login.
         */
        if (
          device.current
        ) {
          logoutUser();

          router.push(
            "/login"
          );

          return;
        }

        /*
         * Other device:
         * remove it from the trusted device list.
         */
        setDevices(
          getUserDevices(
            userEmail
          )
        );

        setSuccess(
          `${device.deviceName} was removed successfully.`
        );
      } catch (err) {
        console.error(
          "Failed to remove device:",
          err
        );

        setError(
          "Unable to remove this device."
        );
      } finally {
        setActionDeviceId(
          ""
        );
      }
    };

  const getDeviceIcon =
    (
      device: DeviceInfo
    ) => {
      const operatingSystem =
        device.operatingSystem.toLowerCase();

      if (
        operatingSystem.includes(
          "android"
        ) ||
        operatingSystem.includes(
          "ios"
        )
      ) {
        return (
          <Tablet
            size={24}
          />
        );
      }

      return (
        <Monitor
          size={24}
        />
      );
    };

  const formatDate =
    (
      value: string
    ) => {
      try {
        return new Date(
          value
        ).toLocaleString();
      } catch {
        return "Unknown";
      }
    };

  if (
    !router.isReady ||
    loading
  ) {
    return (
      <main className="min-h-screen bg-gray-50 text-black">
        <Header
          onMenuClick={() => {}}
        />

        <section className="mx-auto max-w-5xl px-4 pb-16 pt-24 sm:px-6">
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="text-center">
              <RefreshCw
                size={32}
                className="mx-auto animate-spin text-gray-400"
              />

              <p className="mt-4 text-sm text-gray-500">
                Loading your devices...
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-black">
      <Header
        onMenuClick={() => {}}
      />

      <section className="mx-auto max-w-5xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <ShieldCheck
                size={28}
              />

              <h1 className="text-2xl font-bold sm:text-3xl">
                Your devices
              </h1>
            </div>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Review devices that have accessed your account,
              manage trusted devices, and sign out when needed.
            </p>

            {userEmail && (
              <p className="mt-2 text-xs text-gray-400">
                Account: {userEmail}
              </p>
            )}
          </div>

          {/* Refresh */}
          <button
            type="button"
            onClick={
              handleRefresh
            }
            disabled={
              refreshing
            }
            className="flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0 text-red-600"
            />

            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <CheckCircle2
              size={19}
              className="mt-0.5 shrink-0 text-green-600"
            />

            <p className="text-sm text-green-700">
              {success}
            </p>
          </div>
        )}

        {/* Security Info */}
        <div className="mt-7 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldCheck
              size={22}
              className="mt-0.5 shrink-0"
            />

            <div>
              <h2 className="font-semibold">
                Device security
              </h2>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                New or untrusted devices may require OTP
                verification before completing sign in.
              </p>
            </div>
          </div>
        </div>

        {/* Devices */}
        <div className="mt-7 space-y-4">
          {devices.length >
          0 ? (
            devices.map(
              (
                device
              ) => {
                const processing =
                  actionDeviceId ===
                  device.id;

                return (
                  <article
                    key={
                      device.id
                    }
                    className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
                      device.current
                        ? "border-black ring-1 ring-black"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      {/* Device Details */}
                      <div className="flex min-w-0 gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100">
                          {getDeviceIcon(
                            device
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          {/* Title + badges */}
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-semibold">
                              {
                                device.deviceName
                              }
                            </h2>

                            {device.current && (
                              <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-semibold text-green-700">
                                CURRENT
                              </span>
                            )}

                            {device.trusted && (
                              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
                                TRUSTED
                              </span>
                            )}

                            {!device.trusted &&
                              !device.current && (
                                <span className="rounded-full bg-yellow-50 px-2.5 py-1 text-[10px] font-semibold text-yellow-700">
                                  UNTRUSTED
                                </span>
                              )}
                          </div>

                          {/* Browser / OS */}
                          <p className="mt-1 text-xs text-gray-500">
                            {
                              device.browser
                            }
                            {" • "}
                            {
                              device.operatingSystem
                            }
                          </p>

                          {/* Details */}
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl bg-gray-50 p-3">
                              <div className="flex items-center gap-2">
                                <Globe
                                  size={
                                    15
                                  }
                                  className="shrink-0"
                                />

                                <span className="text-xs font-semibold">
                                  IP address
                                </span>
                              </div>

                              <p className="mt-2 break-all text-xs text-gray-500">
                                {
                                  device.ipAddress
                                }
                              </p>
                            </div>

                            <div className="rounded-xl bg-gray-50 p-3">
                              <div className="flex items-center gap-2">
                                <MapPin
                                  size={
                                    15
                                  }
                                  className="shrink-0"
                                />

                                <span className="text-xs font-semibold">
                                  Location
                                </span>
                              </div>

                              <p className="mt-2 text-xs text-gray-500">
                                {
                                  device.location
                                }
                              </p>
                            </div>

                            <div className="rounded-xl bg-gray-50 p-3 sm:col-span-2">
                              <div className="flex items-center gap-2">
                                <Clock3
                                  size={
                                    15
                                  }
                                  className="shrink-0"
                                />

                                <span className="text-xs font-semibold">
                                  Last active
                                </span>
                              </div>

                              <p className="mt-2 text-xs text-gray-500">
                                {formatDate(
                                  device.lastActiveAt
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="lg:pl-4">
                        <button
                          type="button"
                          onClick={() =>
                            handleLogoutDevice(
                              device
                            )
                          }
                          disabled={
                            processing
                          }
                          className={`flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition lg:w-auto ${
                            device.current
                              ? "bg-black text-white hover:bg-gray-800"
                              : "bg-gray-100 text-red-600 hover:bg-red-50"
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          {processing ? (
                            <RefreshCw
                              size={
                                16
                              }
                              className="animate-spin"
                            />
                          ) : (
                            <LogOut
                              size={
                                16
                              }
                            />
                          )}

                          {processing
                            ? "Processing..."
                            : device.current
                            ? "Sign out"
                            : "Remove device"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              }
            )
          ) : (
            /* Empty */
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <Smartphone
                  size={28}
                  className="text-gray-400"
                />
              </div>

              <h2 className="mt-5 text-lg font-semibold">
                No device history
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                Devices will appear here after you sign in
                from a browser or device.
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/login"
                  )
                }
                className="mt-6 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Go to sign in
              </button>
            </div>
          )}
        </div>

        {/* Footer Security Note */}
        <div className="mt-7 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div>
              <h3 className="text-sm font-semibold">
                Keep your account secure
              </h3>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                Remove any device you no longer recognize.
                A removed device will need to complete
                verification again before it can become trusted.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}