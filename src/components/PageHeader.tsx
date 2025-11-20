import React from 'react';

interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ icon, title, subtitle }) => {
  return (
    <div>
      <div className="flex items-center space-x-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-500 text-white shadow-md shadow-sky-200/50">
          {icon}
        </div>
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-500 bg-clip-text text-transparent">
          {title}
        </h1>
      </div>
      {subtitle && <p className="mt-1 text-slate-600 dark:text-slate-300">{subtitle}</p>}
    </div>
  );
};

export default PageHeader;
