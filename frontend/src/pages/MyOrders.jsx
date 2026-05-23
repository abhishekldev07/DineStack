import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import OrderBadges from "../components/OrderBadges";
import { getMyOrders } from "../services/orderHistoryService";
import useRole from "../hooks/useRole";
import { getRoleRedirectPath } from "../utils/roleUtils";

export default function MyOrders() {

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { role, isCustomer } = useRole();

  if (!isCustomer) {
    return <Navigate to={getRoleRedirectPath(role)} replace />;
  }

  const fetchOrders = async () => {
    try {
      const data = await getMyOrders();
      
      // 🌟 Sort: Newest orders (latest created_at) move to the top
      const sortedOrders = [...data].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      setOrders(sortedOrders);

    } catch (error) {
      console.error("Failed to load order history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {

    fetchOrders();

  }, []);

  return (

    <MainLayout>

      <div className="max-w-6xl mx-auto px-6 py-10">

        <h1 className="text-4xl font-bold mb-10">

          My Orders

        </h1>

        {
          loading ? (

            <h2 className="text-xl font-semibold">

              Loading...

            </h2>

          ) : orders.length === 0 ? (

            <h2 className="text-xl font-semibold">

              No orders found

            </h2>

          ) : (

            <div className="space-y-6">

              {
                orders.map((order) => (

                  <div
                    key={order.id}
                    onClick={() =>
                      navigate(`/my-orders/${order.id}`)
                    }
                    className="
                      bg-gray-950/40 rounded-2xl shadow p-6
                      cursor-pointer hover:shadow-xl
                      transition duration-300
                    "
                  >

                    {/* TOP SECTION */}

                    <div className="flex items-center justify-between flex-wrap gap-4">

                      <div>

                        <h2 className="text-2xl font-bold mb-2">

                          Order #{order.id}

                        </h2>

                        <p className="text-gray-500">

                          {
                            new Date(
                              order.created_at
                            ).toLocaleString()
                          }

                        </p>

                      </div>

                      <OrderBadges
                        status={order.status}
                        paymentStatus={order.payment_status}
                        paymentMethod={order.payment_method}
                      />

                    </div>

                    {/* BOTTOM SECTION */}

                    <div className="mt-6 border-t pt-6">

                      <div className="flex items-center justify-between flex-wrap gap-4">

                        <p className="text-lg">

                          Total Price:
                          <span className="font-bold ml-2">

                            Rs. {order.total_price}

                          </span>

                        </p>

                        <p className="text-sm text-gray-500">

                          Click to view full order

                        </p>

                      </div>

                    </div>

                  </div>
                ))
              }

            </div>
          )
        }

      </div>

    </MainLayout>
  );
}