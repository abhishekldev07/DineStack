import {
  createContext,
  useEffect,
  useState
} from "react";

export const CartContext = createContext();

export default function CartProvider({
  children
}) {

  const getCartKey = () => {

    const user = JSON.parse(
      localStorage.getItem("user")
    );

    return user
      ? `cart_${user.user_id}`
      : "cart_guest";
  };

  const loadCart = () => {

    const savedCart =
      localStorage.getItem(
        getCartKey()
      );

    return savedCart
      ? JSON.parse(savedCart)
      : [];
  };

  const [cartItems, setCartItems] =
    useState(loadCart);

  useEffect(() => {

    const handleStorageChange = () => {

      setCartItems(loadCart());
    };

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    setCartItems(loadCart());

    return () => {

      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };

  }, []);

  useEffect(() => {

    localStorage.setItem(
      getCartKey(),
      JSON.stringify(cartItems)
    );

  }, [cartItems]);

  const addToCart = (item) => {

    const existingItem = cartItems.find(
      (cartItem) =>
        cartItem.id === item.id
    );

    if (existingItem) {

      const updatedCart = cartItems.map(
        (cartItem) =>

          cartItem.id === item.id
            ? {
                ...cartItem,
                quantity:
                  cartItem.quantity + 1
              }
            : cartItem
      );

      setCartItems(updatedCart);

    } else {

      setCartItems([
        ...cartItems,
        {
          ...item,
          quantity: 1
        }
      ]);
    }
  };

  const increaseQuantity = (id) => {

    const updatedCart = cartItems.map(
      (item) =>

        item.id === id
          ? {
              ...item,
              quantity:
                item.quantity + 1
            }
          : item
    );

    setCartItems(updatedCart);
  };

  const decreaseQuantity = (id) => {

    const updatedCart = cartItems.map(
      (item) => {

        if (
          item.id === id &&
          item.quantity > 1
        ) {

          return {
            ...item,
            quantity:
              item.quantity - 1
          };
        }

        return item;
      }
    );

    setCartItems(updatedCart);
  };

  const removeFromCart = (id) => {

    const updatedCart =
      cartItems.filter(
        (item) => item.id !== id
      );

    setCartItems(updatedCart);
  };

  const clearCart = () => {

    setCartItems([]);

    localStorage.removeItem(
      getCartKey()
    );
  };

  const totalPrice = cartItems.reduce(
    (total, item) =>
      total +
      item.price * item.quantity,
    0
  );

  return (

    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        increaseQuantity,
        decreaseQuantity,
        removeFromCart,
        clearCart,
        totalPrice
      }}
    >

      {children}

    </CartContext.Provider>
  );
}