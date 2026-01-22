const btnType = {
  primary: "btn--primary",
  secondary: "btn--secondary",
  outline: "btn--outline",
  danger: "btn--danger",
};

function Button({ children, onClick, variant, className, type = "button" }) {
  return (
    <button
      onClick={onClick}
      className={`btn ${btnType[variant]} ${className}`}
      type={type}
    >
      {children}
    </button>
  );
}

export default Button;
