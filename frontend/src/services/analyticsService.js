import API from "./api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const getRevenueTotal = async () => {
  const response = await API.get(
    "/analytics/revenue",
    getAuthHeaders()
  );

  return response.data;
};

export const getOrdersCount = async () => {
  const response = await API.get(
    "/analytics/orders-count",
    getAuthHeaders()
  );

  return response.data;
};

export const getTopItems = async () => {
  const response = await API.get(
    "/analytics/top-items",
    getAuthHeaders()
  );

  return response.data;
};

export const getMonthlyRevenue = async () => {
  const response = await API.get(
    "/analytics/revenue/month",
    getAuthHeaders()
  );

  return response.data;
};

export const getCustomRevenue = async (startDate, endDate) => {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate
  });

  const response = await API.get(
    `/analytics/revenue/custom?${params.toString()}`,
    getAuthHeaders()
  );

  return response.data;
};

export const getDashboardAnalytics = async () => {
  const response = await API.get(
    "/analytics/dashboard",
    getAuthHeaders()
  );

  return response.data;
};

export const getRecentAdminOrders = async (page = 1, limit = 50) => {
  const response = await API.get(
    `/all-orders?page=${page}&limit=${limit}`,
    getAuthHeaders()
  );

  return response.data;
};