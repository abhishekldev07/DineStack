import API from "./api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

const buildMenuFormData = (menuItem) => {
  const formData = new FormData();

  formData.append("name", menuItem.name);
  formData.append("description", menuItem.description || "");
  formData.append("price", String(menuItem.price));
  formData.append("category", menuItem.category);
  formData.append("available", String(Boolean(menuItem.available)));

  if (menuItem.imageFile) {
    formData.append("image", menuItem.imageFile);
  }

  if (menuItem.removeImage) {
    formData.append("remove_image", "true");
  }

  return formData;
};

export const getAdminMenuItems = async () => {
  const response = await API.get("/menu/latest");

  return response.data;
};

export const createMenuItem = async (menuItem) => {
  const formData = buildMenuFormData(menuItem);
  const response = await API.post(
    "/menu",
    formData,
    getAuthHeaders()
  );

  return response.data;
};

export const updateMenuItem = async (itemId, menuItem) => {
  const formData = buildMenuFormData(menuItem);
  const response = await API.put(
    `/menu/${itemId}`,
    formData,
    getAuthHeaders()
  );

  return response.data;
};

export const updateMenuAvailability = async (itemId, available) => {
  const response = await API.patch(
    `/menu/${itemId}/availability`,
    { available },
    getAuthHeaders()
  );

  return response.data;
};

export const deleteMenuItem = async (itemId) => {
  const response = await API.delete(
    `/menu/${itemId}`,
    getAuthHeaders()
  );

  return response.data;
};
