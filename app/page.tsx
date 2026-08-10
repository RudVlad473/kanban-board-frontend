"use client";

// Temporary developer affordance proving the token pipeline's two mode scopes resolve under
// the same semantic token names (D-09). Plan 01-14 replaces this with the real Switch-driven,
// account-persisted theme toggle and removes the theme-probe button.
const toggleTheme = () => {
  document.documentElement.classList.toggle("dark");
};

const Home = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-app">
      <div className="flex flex-col items-center gap-2 rounded-lg bg-bg-surface p-6">
        <h1 className="text-3xl font-bold text-text-primary">Kanban Board</h1>
        <p data-testid="scaffold-probe" className="text-text-muted">
          Scaffold verified end to end.
        </p>
        <button
          type="button"
          onClick={toggleTheme}
          data-testid="theme-probe"
          className="rounded-md bg-bg-primary px-4 py-2 text-text-on-primary"
        >
          Toggle theme
        </button>
      </div>
    </div>
  );
};

export default Home;
