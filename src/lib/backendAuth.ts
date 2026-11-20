
export type BackendUser = {
  id: string;
  name: string;
  email: string;
  role?: string;
};

export type AuthResponse = {
  success: boolean;
  message: string;
  token?: string;
  user?: BackendUser;
};

const API_URL = "http://localhost:5000/api/auth";

// Normalize user data from backend.
// MongoDB may return _id instead of id.
function normalizeBackendUser(rawUser: any): BackendUser | null {
  if (!rawUser) {
    return null;
  }

  const id = String(rawUser.id || rawUser._id || "");
  const name = String(rawUser.name || "").trim();
  const email = String(rawUser.email || "").trim();

  if (!id || !name || !email) {
    console.error("Invalid backend user data:", {
      hasId: Boolean(id),
      hasName: Boolean(name),
      hasEmail: Boolean(email),
    });

    return null;
  }

  return {
    id,
    name,
    email,
    role: rawUser.role || "user",
  };
}

export async function registerWithBackend(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || "Registration failed",
      };
    }

    return {
      success: Boolean(data.success),
      message: data.message || "Registration successful",
      user: normalizeBackendUser(data.user) || undefined,
    };
  } catch (error) {
    console.error("Registration request error:", error);

    return {
      success: false,
      message:
        "Unable to connect to the server. Please make sure the backend is running.",
    };
  }
}

export async function loginWithBackend(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || "Invalid email or password",
      };
    }

    const user = normalizeBackendUser(data.user);

    if (!data.success || !data.token || !user) {
      return {
        success: false,
        message: "Invalid login response from server.",
      };
    }

    return {
      success: true,
      message: data.message || "Login successful",
      token: data.token,
      user,
    };
  } catch (error) {
    console.error("Login request error:", error);

    return {
      success: false,
      message:
        "Unable to connect to the server. Please make sure the backend is running.",
    };
  }
}

export function saveBackendSession(
  token: string,
  user: BackendUser
): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedUser = normalizeBackendUser(user);

  if (!token || !normalizedUser) {
    console.error("Cannot save invalid backend session.");
    return;
  }

  localStorage.setItem("youtube_auth_token", token);

  localStorage.setItem(
    "youtube_backend_user",
    JSON.stringify(normalizedUser)
  );
}

export async function getCurrentBackendUser(): Promise<BackendUser | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const token = localStorage.getItem("youtube_auth_token");

  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // Remove only the invalid backend session.
      localStorage.removeItem("youtube_auth_token");
      localStorage.removeItem("youtube_backend_user");

      return null;
    }

    const data = await response.json();

    if (!data.success || !data.user) {
      console.error("Invalid /me response from backend.");
      return null;
    }

    const user = normalizeBackendUser(data.user);

    if (!user) {
      return null;
    }

    // Keep the normalized backend user in sync.
    localStorage.setItem(
      "youtube_backend_user",
      JSON.stringify(user)
    );

    return user;
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}

export function getBackendToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("youtube_auth_token");
}

export function logoutBackendUser(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem("youtube_auth_token");
  localStorage.removeItem("youtube_backend_user");
}
