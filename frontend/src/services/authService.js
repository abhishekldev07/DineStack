import API, { refreshClient } from "./api";

export const loginUser = async (data) => {

  const response = await API.post(
    "/login",
    data
  );

  return response.data;
};

export const refreshAccessToken = async (refreshToken) => {
  const response = await refreshClient.post(
    "/refresh-token",
    {
      refresh_token: refreshToken
    },
    {
      _skipAuthRefresh: true
    }
  );

  return response.data;
};

export const logoutUser = async (refreshToken) => {
  const response = await refreshClient.post(
    "/logout",
    {
      refresh_token: refreshToken
    },
    {
      _skipAuthRefresh: true
    }
  );

  return response.data;
};

export const registerUser = async (data) => {

  const response = await API.post(
    "/register",
    data
  );

  return response.data;
};

export const verifyEmail = async (token) => {

  const response = await API.get(
    `/verify-email?token=${encodeURIComponent(token)}`
  );

  return response.data;
};

export const resendVerification = async (email) => {

  const response = await API.post(
    "/resend-verification",
    {
      email
    }
  );

  return response.data;
};

export const getVerificationStatus = async (email) => {

  const response = await API.get(
    `/verification-status?email=${encodeURIComponent(email)}`
  );

  return response.data;
};

export const forgotPassword = async (email) => {

  const response = await API.post(
    `/forgot-password?email=${email}`
  );

  return response.data;
};

export const resetPassword = async (
  token,
  newPassword
) => {

  const response = await API.post(
    `/reset-password/${token}`,
    {
      new_password: newPassword
    }
  );

  return response.data;
};

export const changePassword = async (data) => {
  const token = localStorage.getItem("token");

  const response = await API.post(
    "/change-password",
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return response.data;
};

export const getCurrentUser = async () => {
  const response = await API.get("/me");
  return response.data;
};