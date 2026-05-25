import usePost from "@/hooks/usePost";
import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import logo from '../assets/mathHouseLogo.jpeg'
import { PiInfinity, PiPlusMinus, PiSigmaBold, PiSquareLogoLight } from 'react-icons/pi';
import { TbGeometry, TbLambda, TbMathSymbols } from 'react-icons/tb';

const Login = () => {
const { postData, loading } = usePost();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
       const res = await postData(
      {
        email,
        password,
      },
      "/api/admin/auth/login",
      "Login successfully!"
    );

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", "admin" );
           

      navigate("/admin");
    } catch (err) {
      console.error("Login failed. Invalid email or password.");
    }
          
  };

  return (
<div className="min-h-screen flex items-center justify-center bg-[#EEEEEE] relative overflow-hidden font-serif">
      
      {/* رموز رياضية عائمة باللون الأحمر والذهبي */}
     <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-50">
  {/* رموز كبيرة (أعمدة التصميم) */}
  <PiSquareLogoLight  className="absolute top-10 left-[8%] w-20 h-20 text-one animate-float-slow opacity-40" />
  <PiSigmaBold className="absolute bottom-10 right-[5%] w-28 h-28 text-one animate-float-slow opacity-50" />
  <PiInfinity className="absolute bottom-[10%] left-[5%] w-24 h-24 text-three animate-float opacity-60" />
  
  {/* رموز متوسطة وأشكال هندسية */}
  <TbLambda className="absolute top-[15%] right-[10%] w-16 h-16 text-four animate-float-delayed opacity-30" />
  <TbGeometry className="absolute top-[35%] right-[25%] w-14 h-14 text-three animate-pulse opacity-40" />
  <PiPlusMinus className="absolute top-[60%] left-[12%] w-12 h-12 text-four animate-bounce-slow opacity-25" />
  <TbMathSymbols className="absolute bottom-[25%] right-[20%] w-16 h-16 text-one animate-float opacity-45" />

  {/* نصوص ومعادلات (Text Formulas) */}
  <span className="absolute top-[10%] left-[45%] text-5xl font-serif italic text-one/10 animate-pulse">f(x)</span>
  <span className="absolute top-[45%] left-[3%] text-7xl font-light text-one/30 animate-float">∫</span>
  <span className="absolute top-[20%] left-[25%] text-3xl font-mono font-bold text-three/40">∑ n=1</span>
  <span className="absolute bottom-[40%] right-[8%] text-4xl font-serif italic text-three/80 animate-bounce-slow">π</span>
  <span className="absolute bottom-[20%] left-[30%] text-xl font-mono text-four/70 tracking-tighter">{"[ a  b ; c  d ]"}</span>
  <span className="absolute top-[70%] right-[15%] text-2xl font-bold animate-float text-one/60">lim x→∞</span>
  <span className="absolute top-[80%] left-[20%] text-4xl font-serif text-three/40">Δy/Δx</span>

  {/* أشكال هندسية صغيرة (توزيع نقطي) */}
  <div className="absolute top-[50%] right-[40%] w-8 h-8 border-2 border-three/20 rotate-45 animate-spin-slow"></div>
  <div className="absolute bottom-[15%] right-[45%] w-6 h-6 border-2 border-four/20 rounded-full animate-ping"></div>
  <div className="absolute top-[30%] left-[35%] w-0 h-0 border-l-[15px] border-l-transparent border-b-[25px] border-b-one/10 border-r-[15px] border-r-transparent animate-float"></div>
</div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md p-0.5 rounded-3xl bg-gradient-to-b from-three to-one shadow-[0_20px_60px_rgba(125,10,10,0.3)]">
        <div className="bg-white p-10 rounded-[1.7rem] flex flex-col items-center">
          
          {/* Logo Section */}
         <div className="relative w-64 h-64 flex items-center justify-center">
  {/* الحلقة الخارجية تدور ببطء */}
  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-three border-r-three/30 animate-[spin_3s_linear_infinite]"></div>
  
  {/* الحلقة الداخلية تدور بالعكس وبسرعة مختلفة */}
  <div className="absolute inset-4 rounded-full border-2 border-transparent border-b-three border-l-three/50 animate-[spin_4s_linear_infinite_reverse]"></div>

  {/* حاوية اللوجو الثابتة */}
  <div className="relative z-10 w-48 h-48 bg-white rounded-full flex items-center justify-center shadow-2xl p-2">
    <img 
      src={logo} 
      alt="Logo" 
      className="w-full h-full object-contain rounded-full" 
    />
  </div>
  
  {/* توهج خلفي */}
  <div className="absolute inset-8 bg-one blur-xl opacity-20 animate-pulse"></div>
</div>

          <h2 className="text-3xl font-black text-one mb-1 tracking-tight">
            Math<span className="text-one">Admin</span>
          </h2>
          <div className="h-1 w-20 bg-three mb-8 rounded-full"></div>

          <form className="w-full space-y-6" onSubmit={handleLogin}>
            <div className="relative group">
              <label className="block text-xs font-bold text-one uppercase tracking-[0.2em] mb-2 ml-1">Mathematics ID</label>
              <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="admin@math-portal.com"
                className="w-full bg-[#EEEEEE]/50 border-2 border-transparent border-b-three p-4 rounded-xl focus:bg-white focus:border-one outline-none transition-all text-one placeholder:text-gray-400"
              />
            </div>

            <div className="relative group">
              <label className="block text-xs font-bold text-one uppercase tracking-[0.2em] mb-2 ml-1">Access Cipher</label>
              <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
                className="w-full bg-[#EEEEEE]/50 border-2 border-transparent border-b-three p-4 rounded-xl focus:bg-white focus:border-one outline-none transition-all text-one placeholder:text-gray-400"
              />
            </div>

<button
  disabled={loading}
  className={`w-full group relative overflow-hidden bg-one text-three font-bold py-4 rounded-xl shadow-lg transition-all 
  active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed`}
>
  <span className="relative z-10 flex items-center justify-center gap-3 tracking-widest">
  {loading ? (
  <div className="flex items-center gap-3">
    <div className="relative w-6 h-6">
      <span className="absolute inset-0 bg-current animate-[spin_1.2s_linear_infinite] rounded-sm"></span>
      <span className="absolute inset-1 bg-current opacity-70 animate-[ping_1.2s_ease-in-out_infinite] rounded-full"></span>
    </div>
    <span>LOADING...</span>
  </div>
) : (
  "SIGN IN TO SYSTEM"
)}
  </span>

  {!loading && (
    <div className="absolute inset-0 bg-four translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
  )}
</button>
            
           
          </form>
        </div>
      </div>

      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
          @keyframes float-slow {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            50% { transform: translate(15px, -35px) rotate(-10deg); }
          }
          @keyframes float-delayed {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-30px) scale(1.1); }
          }
          .animate-float { animation: float 6s infinite ease-in-out; }
          .animate-float-slow { animation: float-slow 10s infinite ease-in-out; }
          .animate-float-delayed { animation: float-delayed 8s infinite ease-in-out; animation-delay: 2s; }
          .animate-bounce-slow { animation: bounce 4s infinite alternate ease-in-out; }
          @keyframes bounce {
            from { transform: translateY(-10px); }
            to { transform: translateY(10px); }
          }
        `}
      </style>
      <Toaster />
    </div>
  );
};

export default Login;
