import axios from "axios";

const API = "http://127.0.0.1:8000";

export const updatePaymentStatus = async (
  paymentId,
  payment_status
) => {

  const token = localStorage.getItem("token");

  const response = await axios.put(
    `${API}/payments/${paymentId}/status`,
    {
      payment_status
    },
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return response.data;
};