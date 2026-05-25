import React, { useState, useMemo, useEffect } from "react";
import { LogOut, ChevronRight, X, Search } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { TbMathSymbols } from "react-icons/tb";
import { IoIosArrowDropleft } from "react-icons/io";

const SideBar = ({ menuItems, isExpanded, setIsExpanded, isMobileOpen, setIsMobileOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/", { replace: true });
  };

  // دالة مساعدة للتحقق مما إذا كان المسار نشطاً (تدعم Add/Edit/Info)
  const isRouteActive = (itemPath) => {
    if (!itemPath) return false;
    // التحقق إذا كان المسار الحالي هو نفسه أو يبدأ بالمسار المطلوب متبوعاً بـ /
    // مثال: /admin/users يتطابق مع /admin/users/add
    return location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);
  };

  const filteredMenu = useMemo(() => {
    if (!searchTerm.trim()) return menuItems;
    return menuItems.filter((item) => {
      const parentMatches = item.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchingChildren = item.children?.filter((child) =>
        child.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return parentMatches || (matchingChildren && matchingChildren.length > 0);
    });
  }, [searchTerm, menuItems]);

  // فتح القسم تلقائياً عند تغيير المسار (بما في ذلك صفحات Edit/Add)
  useEffect(() => {
    menuItems.forEach((item) => {
      const isChildActive = item.children?.some(child => isRouteActive(child.path));
      if (isChildActive || isRouteActive(item.path)) {
        setActiveSubmenu(item.title);
      }
    });
  }, [location.pathname, menuItems]);

  return (
    <>
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`
          bg-white shadow-2xl flex flex-col h-screen transition-all duration-300 ease-in-out z-50
          fixed inset-y-0 left-0 transform 
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0 
          ${isExpanded ? "w-72" : "w-20"}
        `}
      >
        {/* Header */}
   <div 
  onClick={() => setIsExpanded(!isExpanded)}
  className="flex relative items-center  p-4 h-20 border-b border-gray-50 cursor-pointer hover:bg-gray-50/50 transition-colors shrink-0 overflow-hidden"
>
  <div className="flex items-center gap-x-4 min-w-max">
    <div className="bg-one/10 p-2 rounded-xl text-one">
      <TbMathSymbols size={28} />
    </div>
    <div className={`transition-all duration-300 ${!isExpanded ? "opacity-0 translate-x-10" : "opacity-100 translate-x-0"}`}>
      <h1 className="font-bold text-xl text-gray-800 whitespace-nowrap">Math House</h1>
      <p className="text-[10px] text-gray-400 font-medium tracking-widest uppercase text-left">Admin Panel</p>
    </div>
  </div>

  {/* السهم يتحرك بدل opacity/translate */}
  {isExpanded&&(
    <IoIosArrowDropleft 
      size={28} 
      className={`transition-transform absolute text-one duration-300 transform right-0 ${isExpanded ? "rotate-0" : "rotate-180"}`} 
    />

  )}
</div>

        {/* Search */}
        <div className="px-4 py-4 shrink-0">
          <div onClick={() => !isExpanded && setIsExpanded(true)} className={`relative flex items-center group cursor-pointer ${!isExpanded ? "justify-center" : ""}`}>
            <div className={`absolute left-3 transition-colors ${searchTerm ? "text-one" : "text-gray-400"} ${!isExpanded ? "static left-0" : ""}`}><Search size={18} /></div>
            {isExpanded && (
              <input
                type="text" placeholder="Search..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-one/20 focus:border-one transition-all"
              />
            )}
          </div>
        </div>

        {/* Navigation List */}
        <ul className="flex-1 px-3 space-y-1.5 overflow-y-auto custom-scrollbar pt-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {filteredMenu.map((item) => {
            const hasChildren = item.children?.length > 0;
            
            // استخدام الدالة الجديدة للتحقق من الحالة النشطة
            const isAnyChildActive = item.children?.some(child => isRouteActive(child.path));
            const isParentActive = isRouteActive(item.path);
            const isSectionActive = isParentActive || isAnyChildActive;

            const isOpen = activeSubmenu === item.title;

            return (
              <li key={item.title} className="list-none">
                {hasChildren ? (
                  <div className="flex flex-col">
                    <button
                      onClick={() => {
                        if (!isExpanded) setIsExpanded(true);
                        // إذا كان القسم نشطاً بالفعل ومفتوحاً، نغلقه، وإلا نفتحه
                        setActiveSubmenu(isOpen ? null : item.title);
                        
                        // التوجه لأول ابن فقط إذا كان الشريط مغلقاً (لتحسين التجربة)
                        if (!isExpanded) navigate(item.children[0].path);
                      }}
                      className={`
                        w-full flex items-center p-3 rounded-xl transition-all duration-200 group
                        ${isSectionActive ? "bg-one text-white shadow-lg shadow-one/30" : "text-gray-600 hover:bg-gray-50"}
                        ${!isExpanded ? "justify-center" : "gap-x-4"}
                      `}
                    >
                      <span className={`shrink-0 transition-transform duration-200 ${isSectionActive ? "scale-110" : ""}`}>
                        {item.icon}
                      </span>
                      
                      {isExpanded && (
                        <>
                          <span className="font-semibold text-[14px] flex-1 text-left">{item.title}</span>
                          <ChevronRight size={16} className={`transition-transform duration-300 ${isOpen ? "rotate-90" : "opacity-40"}`} />
                        </>
                      )}
                    </button>

                    {/* Submenu */}
                    {isOpen && isExpanded && (
                      <ul className="mt-1 ml-6 border-l border-gray-100 space-y-1 py-1 animate-in fade-in slide-in-from-top-1 duration-300">
                        {item.children.map((child, i) => {
                          const isChildActive = isRouteActive(child.path);
                          return (
                            <li key={i}>
                              <NavLink
                                to={child.path}
                                onClick={() => setIsMobileOpen(false)}
                                className={`flex items-center gap-x-3 px-4 py-2 ml-3 rounded-lg text-sm transition-all duration-200 ${isChildActive ? "text-one font-bold bg-one/10" : "text-gray-400 hover:text-one hover:bg-one/5"}`}
                              >
                                {child.icon && <span className="text-[16px]">{child.icon}</span>}
                                <span className="whitespace-nowrap">{child.title}</span>
                              </NavLink>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : (
                  <NavLink
                    to={item.path}
                    onClick={() => {
                      setIsMobileOpen(false);
                      setActiveSubmenu(null);
                      if (!isExpanded) setIsExpanded(true);
                    }}
                    className={({ isActive }) => `
                      flex items-center p-3 rounded-xl transition-all duration-200 group
                      ${(isActive || isRouteActive(item.path)) ? "bg-one text-white shadow-lg shadow-one/30" : "text-gray-600 hover:bg-gray-50"}
                      ${!isExpanded ? "justify-center" : "gap-x-4"}
                    `}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {isExpanded && <span className="font-semibold text-[14px]">{item.title}</span>}
                  </NavLink>
                )}
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        <div className="p-4 border-t border-gray-50 mt-auto shrink-0">
          <button onClick={handleLogout} className={`group flex items-center p-3 w-full rounded-xl transition-all duration-200 ${!isExpanded ? "justify-center" : "gap-x-4"} text-gray-400 hover:bg-red-50 hover:text-red-500`}>
            <LogOut size={20} className="shrink-0 transition-transform group-hover:-translate-x-1" />
            {isExpanded && <span className="font-bold text-sm">Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default SideBar;