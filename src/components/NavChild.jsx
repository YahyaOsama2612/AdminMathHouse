import React from 'react';
import { IoEnterSharp } from "react-icons/io5";
import { useNavigate } from "react-router-dom";

const NavChild = ({ route, state }) => {
  const navigate = useNavigate();

  return (
    <div>
      <button
onClick={() => navigate(route, { state })}
      className="group p-2"
      >
        <IoEnterSharp
          className="
            text-yellow-700 
            w-6 h-6 
            rounded-lg 
            transition-all 
            duration-200
            group-hover:text-white
            group-hover:bg-yellow-700
            group-hover:scale-110
          "
        />
      </button>
    </div>
  );
};

export default NavChild;