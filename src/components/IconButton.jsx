import React from "react";
import { useNavigate } from "react-router-dom";

const IconButton = ({
  icon: Icon,
  color = "bg-blue-500",
  textColor = "text-white",
  navigateTo = "/",
  children,
  onClick, 
  size = "p-1",
  rounded = "rounded-lg",
  name // الاسم اللي هيظهر عند hover
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) onClick();
    if (navigateTo) navigate(navigateTo);
  };

  return (
    <button
      onClick={handleClick}
      title={name} // هنا بضيف الاسم ك tooltip
      className={`${size} ${rounded} flex items-center justify-center gap-1 transition-transform hover:scale-105 ${color}`}
    >
      {Icon && <Icon className={`w-5 h-5 ${textColor}`} />}
      {children && <span className={`${textColor} text-sm`}>{children}</span>}
    </button>
  );
};

export default IconButton;