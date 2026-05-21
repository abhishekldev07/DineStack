import API from "./api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const getReservationAvailability = async (reservationDate, guestCount) => {
  const response = await API.get(
    `/reservations/availability?reservation_date=${reservationDate}&guest_count=${guestCount}`,
    getAuthHeaders()
  );

  return response.data;
};

export const createReservation = async (payload) => {
  const response = await API.post(
    "/reservations",
    payload,
    getAuthHeaders()
  );

  return response.data;
};

export const payReservationDeposit = async (reservationId, payload) => {
  const response = await API.post(
    `/reservations/${reservationId}/payment`,
    payload,
    getAuthHeaders()
  );

  return response.data;
};

export const getMyReservations = async () => {
  const response = await API.get(
    "/my-reservations",
    getAuthHeaders()
  );

  return response.data;
};

export const getMyReservation = async (reservationId) => {
  const response = await API.get(
    `/my-reservations/${reservationId}`,
    getAuthHeaders()
  );

  return response.data;
};

export const getAdminReservations = async (params = {}) => {
  const query = new URLSearchParams();

  if (params.scope) query.set("scope", params.scope);
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  if (params.date) query.set("date", params.date);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));

  const response = await API.get(
    `/reservations/admin?${query.toString()}`,
    getAuthHeaders()
  );

  return response.data;
};

export const getReservationAnalytics = async (targetDate) => {
  const query = targetDate ? `?target_date=${targetDate}` : "";

  const response = await API.get(
    `/reservations/admin/analytics${query}`,
    getAuthHeaders()
  );

  return response.data;
};

export const updateReservationStatus = async (reservationId, status) => {
  const response = await API.patch(
    `/reservations/admin/${reservationId}/status`,
    { status },
    getAuthHeaders()
  );

  return response.data;
};

export const assignReservationTable = async (reservationId, tableNumber, seatingType) => {
  const response = await API.patch(
    `/reservations/admin/${reservationId}/table`,
    { table_number: tableNumber, seating_type: seatingType },
    getAuthHeaders()
  );

  return response.data;
};
