import API from "./api";

export const getAllOrders = async (
  page = 1,
  limit = 10
) => {

  const token = localStorage.getItem("token");

  const response = await API.get(

    `/all-orders?page=${page}&limit=${limit}`,

    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return response.data;
};
export const getOrdersByStatus = async (
  status,
  page = 1,
  limit = 10
) => {

  const token = localStorage.getItem("token");

  const response = await API.get(

    `/orders/status/${status}?page=${page}&limit=${limit}`,

    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return response.data;
};
export const updateOrderStatus = async (
  orderId,
  status
) => {

  const token = localStorage.getItem("token");

  const response = await API.put(

    `/orders/${orderId}/status`,

    {
      status: status
    },

    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return response.data;
};
export const searchOrders = async (
  searchType,
  query,
  options = {}
) => {

  const token = localStorage.getItem("token");

  const params = new URLSearchParams({
    search_type: searchType,
    query: String(query)
  });

  if (options.status) {
    params.set("status", options.status);
  }

  if (options.paymentStatus) {
    params.set("payment_status", options.paymentStatus);
  }

  const response = await API.get(
    `/orders/search?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return response.data;
};