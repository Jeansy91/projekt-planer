const MemberRow = ({ avatar, avatarUrl, avatarBg, avatarText, name, subtitle, right, bg = '', border = '' }) => (
  <div className={`flex items-center gap-3 p-2.5 rounded-xl ${bg} ${border}`}>
    {avatarUrl ? (
      <img src={avatarUrl} alt="" className="w-8 h-8 shrink-0 rounded-full object-cover" />
    ) : (
      <div className={`w-8 h-8 shrink-0 rounded-full ${avatarBg} flex items-center justify-center ${avatarText} text-xs font-bold`}>
        {avatar}
      </div>
    )}
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{name}</div>
      <div className="text-xs text-slate-400 dark:text-slate-500 truncate">{subtitle}</div>
    </div>
    <div className="shrink-0 flex items-center gap-2">
      {right}
    </div>
  </div>
);

export default MemberRow;
