import API from "./api";

export const placeOrder = async (orderData) => {

  const token = localStorage.getItem("token");

  const payload = Array.isArray(orderData)
    ? { items: orderData }
    : orderData;

  const response = await API.post(

    "/orders",

    payload,

    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return response.data;
};

export const getSingleOrder = async (
  orderId
) => {

  const token = localStorage.getItem("token");

  const response = await API.get(

    `/my-orders/${orderId}`,

    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return response.data;
};

export const cancelOrder = async (
  orderId
) => {

  const token = localStorage.getItem("token");

  const response = await API.put(

    `/orders/${orderId}/cancel`,

    {},

    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return response.data;
};

export const editOrder = async (
  orderId,
  items
) => {

  const token = localStorage.getItem("token");

  const response = await API.put(

    `/orders/${orderId}`,

    {
      items: items
    },

    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return response.data;
};