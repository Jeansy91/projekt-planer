import React, { useState, useEffect } from 'react';
import { X, Check, Users, Code, Terminal, Database, Server, Bug, GitBranch, TestTube2, Rocket, Shield, Globe, Cpu, Wrench, Briefcase, Building2, Phone, CreditCard, Receipt, ShoppingCart, Package, Truck, BarChart3, Megaphone, Scale, Headphones, Network, UserCog, Factory } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { colors, taskBarStyle } from '../../utils/constants';

const TEAM_ICONS = [
  { key: 'users', Icon: Users },
  { key: 'code', Icon: Code },
  { key: 'terminal', Icon: Terminal },
  { key: 'database', Icon: Database },
  { key: 'server', Icon: Server },
  { key: 'bug', Icon: Bug },
  { key: 'git-branch', Icon: GitBranch },
  { key: 'test-tube', Icon: TestTube2 },
  { key: 'cpu', Icon: Cpu },
  { key: 'network', Icon: Network },
  { key: 'rocket', Icon: Rocket },
  { key: 'user-cog', Icon: UserCog },
  { key: 'briefcase', Icon: Briefcase },
  { key: 'building', Icon: Building2 },
  { key: 'bar-chart', Icon: BarChart3 },
  { key: 'credit-card', Icon: CreditCard },
  { key: 'receipt', Icon: Receipt },
  { key: 'shopping-cart', Icon: ShoppingCart },
  { key: 'package', Icon: Package },
  { key: 'truck', Icon: Truck },
  { key: 'factory', Icon: Factory },
  { key: 'megaphone', Icon: Megaphone },
  { key: 'globe', Icon: Globe },
  { key: 'shield', Icon: Shield },
  { key: 'scale', Icon: Scale },
  { key: 'phone', Icon: Phone },
  { key: 'headphones', Icon: Headphones },
];

export const getTeamIcon = (iconKey) => {
  const entry = TEAM_ICONS.find(i => i.key === iconKey);
  return entry ? entry.Icon : Users;
};

const TeamDetailModal = ({ show, team, onClose, onUpdate }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [color, setColor] = useState('blue');
  const [icon, setIcon] = useState('users');

  useEffect(() => {
    if (team) {
      setName(team.name || '');
      setColor(team.color || 'blue');
      setIcon(team.icon || 'users');
    }
  }, [team]);

  if (!show || !team) return null;

  const handleSave = () => {
    if (!name.trim()) return;
    onUpdate(team.id, { name: name.trim(), color, icon });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className={`px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-${color}-50/60 dark:bg-${color}-900/30`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-xl bg-${color}-100 flex items-center justify-center shrink-0`}>
                <Users size={18} className={`text-${color}-600`} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">{t('dialogs.teamDetail.title')}</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{team.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" aria-label={t('a11y.close')}><X size={16} aria-hidden="true" /></button>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold mb-2">{t('dialogs.teamDetail.nameLabel')}</label>
            <input
              autoFocus
              data-testid="team-detail-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
              className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-100 dark:focus:ring-blue-800/30 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">{t('dialogs.teamDetail.colorLabel')}</label>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  data-testid={`team-color-${c}`}
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full flex items-center justify-center task-bar transition-all ${color === c ? 'outline-2 outline-offset-2 outline-slate-400 dark:outline-slate-500 scale-110' : 'hover:scale-110'}`}
                  style={taskBarStyle(c)}
                >
                  {color === c && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">{t('dialogs.teamDetail.iconLabel')}</label>
            <div className="flex flex-wrap gap-2">
              {TEAM_ICONS.map(({ key, Icon }) => (
                <button
                  key={key}
                  data-testid={`team-icon-${key}`}
                  onClick={() => setIcon(key)}
                  className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all ${icon === key ? `bg-${color}-100 text-${color}-600 ring-2 ring-${color}-400` : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                >
                  <Icon size={18} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button onClick={onClose} className="py-2 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors">{t('dialogs.teamDetail.cancel')}</button>
            <button
              data-testid="team-detail-save"
              onClick={handleSave}
              disabled={!name.trim()}
              className={`py-2 px-4 bg-${color}-600 hover:bg-${color}-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {t('dialogs.teamDetail.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamDetailModal;
