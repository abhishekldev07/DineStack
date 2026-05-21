import API from "./api";

export const getAllUsers = async () => {
  const token = localStorage.getItem("token");

  const response = await API.get(
    `/admin/users`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return response.data;
};

export const searchUsers = async (params) => {
  const token = localStorage.getItem("token");

  const query = new URLSearchParams();

  if (params.id) {
    query.set("id", params.id);
  }

  if (params.username) {
    query.set("username", params.username);
  }

  if (params.email) {
    query.set("email", params.email);
  }

  const response = await API.get(
    `/admin/users/search?${query.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return response.data;
};

export const updateUserRole = async (userId, role) => {
  const token = localStorage.getItem("token");

  const response = await API.patch(
    `/admin/users/${userId}/role`,
    { role },
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return response.data;
};
