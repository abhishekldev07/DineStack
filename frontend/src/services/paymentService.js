
import API from "./api"; 

export const updatePaymentStatus = async (
  paymentId,
  payment_status
) => {
  const response = await API.put(`/payments/${paymentId}/status`, {
    payment_status
  });

  return response.data;
};