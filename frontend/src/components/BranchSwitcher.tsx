import React, { useState, useEffect } from 'react';
import { Store, ChevronDown } from 'lucide-react';
import { branchApi } from '../services/api';
import toast from 'react-hot-toast';
import { getUser, hasRole, ROLES } from '../utils/permissions';

const BranchSwitcher: React.FC = () => {
  const [branches, setBranches] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const user = getUser();

  const isAdmin = hasRole(ROLES.SUPER_ADMIN, ROLES.ADMIN);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await branchApi.getBranches();
        setBranches(res.data);
      } catch (error) {
        console.error('Error fetching branches', error);
      }
    };
    fetchBranches();
  }, []);

  const handleSwitch = (branch: any) => {
    const updatedUser = { 
      ...user, 
      branch_id: branch.id, 
      branch_name: branch.name,
      color_hex: branch.colorHex 
    };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setIsOpen(false);
    toast.success(`Cambiado a ${branch.name}`);
    
    // Trigger a window event or reload to update other components
    window.dispatchEvent(new Event('branch-changed'));
    // Force a small delay then reload to ensure all states reset correctly
    setTimeout(() => {
        window.location.reload();
    }, 500);
  };

  const currentBranch = branches.find(b => b.id === user.branch_id) || { name: user.branch_name || 'Principal', colorHex: user.color_hex || '#3b82f6' };

  return (
    <div className="branch-switcher-container">
      <button 
        className={`branch-selector-btn ${!isAdmin ? 'static' : ''}`} 
        onClick={() => isAdmin && setIsOpen(!isOpen)}
        style={{ cursor: isAdmin ? 'pointer' : 'default' }}
      >
        <div className="branch-dot" style={{ background: currentBranch.colorHex }}></div>
        <Store size={18} />
        <span>{currentBranch.name}</span>
        {isAdmin && <ChevronDown size={14} className={`chevron ${isOpen ? 'open' : ''}`} />}
      </button>

      {isOpen && (
        <div className="branch-dropdown shadow-premium">
          {branches.map(branch => (
            <button 
              key={branch.id} 
              className={`branch-option ${branch.id === user.branch_id ? 'active' : ''}`}
              onClick={() => handleSwitch(branch)}
            >
              <div className="branch-dot" style={{ background: branch.colorHex }}></div>
              <span>{branch.name}</span>
            </button>
          ))}
        </div>
      )}

      <style>{`
        .branch-switcher-container {
          position: relative;
          z-index: 100;
        }

        .branch-selector-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: ${currentBranch.colorHex}15;
          border: 1px solid ${currentBranch.colorHex}40;
          padding: 0.5rem 1rem;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 700;
          color: ${currentBranch.colorHex};
          transition: all 0.2s;
        }

        .branch-selector-btn:hover {
          border-color: ${currentBranch.colorHex};
          background: ${currentBranch.colorHex}25;
        }

        .branch-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${currentBranch.colorHex};
          box-shadow: 0 0 10px ${currentBranch.colorHex}80;
        }

        .chevron {
          transition: transform 0.2s;
          color: ${currentBranch.colorHex}aa;
        }

        .chevron.open {
          transform: rotate(180deg);
        }

        .branch-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          background: white;
          border-radius: 12px;
          min-width: 200px;
          padding: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 4px;
          z-index: 1000;
        }

        .branch-option {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border: none;
          background: none;
          border-radius: 8px;
          cursor: pointer;
          width: 100%;
          text-align: left;
          font-weight: 500;
          color: #64748b;
          transition: all 0.2s;
        }

        .branch-option:hover {
          background: #f1f5f9;
          color: #1e293b;
        }

        .branch-option.active {
          background: #eff6ff;
          color: #3b82f6;
        }
      `}</style>
    </div>
  );
};

export default BranchSwitcher;
