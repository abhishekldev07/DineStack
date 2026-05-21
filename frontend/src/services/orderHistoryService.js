import API from "./api";

export const getMyOrders = async () => {

  const token = localStorage.getItem("token");

  const response = await API.get(

    "/my-orders",

    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return response.data;
};