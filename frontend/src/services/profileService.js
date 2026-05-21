import API from "./api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const getMyProfile = async () => {
  const response = await API.get(
    "/me/profile",
    getAuthHeaders()
  );

  return response.data;
};

export const getUserProfile = async (userId) => {
  const response = await API.get(
    `/admin/users/${userId}/profile`,
    getAuthHeaders()
  );

  return response.data;
};