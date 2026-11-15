/** Loading placeholder in the MathPortal admin design (skeleton blocks instead of a full-screen animation). */
const Loader = () => (
  <div className="w-full py-2" role="status" aria-label="Loading">
    <div className="skel h-8 w-56 mb-2"></div>
    <div className="skel h-4 w-80 mb-5"></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">{[1, 2, 3, 4].map((i) => <div key={i} className="skel h-20"></div>)}</div>
    <div className="skel h-12 mb-3"></div>
    <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="skel h-10"></div>)}</div>
  </div>
);

export default Loader;
