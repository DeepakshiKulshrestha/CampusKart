import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Package,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Eye,
  Search,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  UserX,
  Sparkles,
} from 'lucide-react';
import {
  getStoredProducts,
  getStoredUsers,
  getReportedListings,
  getTransactions,
  dismissReport,
  removeListingByAdmin,
  updateUserStatus,
  updateProduct,
  formatINR,
} from '../services/storage';
import { getProductImageUrl, DEFAULT_PRODUCT_IMAGE } from '../utils/imageUrl';
import Button from '../components/Button';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('moderation'); // 'moderation' | 'reported' | 'users' | 'commission'
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');

  // Selected for action
  const [actionNotice, setActionNotice] = useState('');
  const [modalItem, setModalItem] = useState(null);

  const loadData = () => {
    setProducts(getStoredProducts());
    setUsers(getStoredUsers());
    setReports(getReportedListings());
    setTransactions(getTransactions());
  };

  useEffect(() => {
    loadData();
    const handleTxnUpdate = () => loadData();
    window.addEventListener('campuskart_transaction_updated', handleTxnUpdate);
    return () => window.removeEventListener('campuskart_transaction_updated', handleTxnUpdate);
  }, []);

  const showNotice = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(''), 3000);
  };

  // Moderation actions
  const handleRemoveProduct = (productId, reportId) => {
    removeListingByAdmin(productId, reportId);
    loadData();
    showNotice(`Product listing was permanently removed by Admin.`);
  };

  const handleDismissReport = (reportId) => {
    dismissReport(reportId);
    loadData();
    showNotice(`Report was dismissed. Listing marked safe.`);
  };

  const handleToggleUserStatus = (user) => {
    const nextStatus = user.status === 'Suspended' ? 'Active' : 'Suspended';
    updateUserStatus(user.id, nextStatus);
    loadData();
    showNotice(`User ${user.firstName} ${user.lastName} is now ${nextStatus}.`);
  };

  const handleApproveProduct = (product) => {
    updateProduct(product.id, { verified: true });
    loadData();
    showNotice(`"${product.title}" has been verified & approved.`);
  };

  // Calculations
  const totalVolume = products.reduce((acc, curr) => acc + (parseFloat(curr.price) || 0), 0);
  const totalCommission = transactions.reduce(
    (acc, t) => acc + (t.commissionAmount !== undefined ? t.commissionAmount : (t.amount * 0.05)),
    0
  );
  const activeListingsCount = products.filter((p) => p.status === 'Active').length;
  const soldListingsCount = products.filter((p) => p.status === 'Sold').length;

  return (
    <div className="min-h-screen bg-[#F5F5F2] pb-24 pt-8 font-sans">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Admin Header */}
        <div className="rounded-4xl bg-[#082B91] p-6 sm:p-10 text-white shadow-xl bg-grid-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#B7FF00] px-3.5 py-1 text-xs font-heading font-extrabold uppercase tracking-wider text-[#111111] shadow-sticker-sm mb-2">
                <ShieldAlert className="h-3.5 w-3.5 text-[#111111]" />
                <span>Campus Trust & Safety Administration</span>
              </div>
              <h1 className="font-display uppercase text-2xl sm:text-4xl font-black text-white">
                Admin Dashboard
              </h1>
              <p className="mt-1 text-xs text-blue-100 sm:text-sm max-w-xl">
                Monitor platform metrics, manage 5% commission revenue, review reported content, and moderate TIET accounts.
              </p>
            </div>

            <div className="flex gap-3">
              <div className="rounded-3xl border border-white/20 bg-white/10 px-5 py-3 text-xs">
                <span className="text-blue-200 font-heading font-bold uppercase tracking-wider text-[11px]">Gross Volume:</span>
                <p className="font-heading text-2xl font-black text-[#B7FF00]">{formatINR(totalVolume)}</p>
              </div>
              <div className="rounded-3xl border border-white/20 bg-white/10 px-5 py-3 text-xs">
                <span className="text-blue-200 font-heading font-bold uppercase tracking-wider text-[11px]">Commission (5%):</span>
                <p className="font-heading text-2xl font-black text-white">{formatINR(totalCommission)}</p>
              </div>
            </div>
          </div>
        </div>

        {actionNotice && (
          <div className="rounded-3xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-heading font-bold text-emerald-800 flex items-center gap-2 shadow-sm animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card">
            <div className="flex items-center justify-between text-[#62666F] mb-3">
              <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#62666F]">
                Total Users
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-2xl bg-[#0638C9]/10 text-[#0638C9]">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="font-heading text-3xl sm:text-4xl font-black text-[#111111]">{users.length}</div>
            <p className="mt-1 text-[11px] text-[#62666F]">Verified campus accounts</p>
          </div>

          <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card">
            <div className="flex items-center justify-between text-[#62666F] mb-3">
              <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#62666F]">
                Total Listings
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="font-heading text-3xl sm:text-4xl font-black text-[#111111]">{products.length}</div>
            <p className="mt-1 text-[11px] text-[#62666F]">
              {activeListingsCount} active &bull; {soldListingsCount} sold
            </p>
          </div>

          <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card">
            <div className="flex items-center justify-between text-[#62666F] mb-3">
              <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#62666F]">
                Reports
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-2xl bg-red-50 text-red-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="font-heading text-3xl sm:text-4xl font-black text-[#111111]">{reports.length}</div>
            <p className="mt-1 text-[11px] text-[#62666F]">Requires review</p>
          </div>

          <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card">
            <div className="flex items-center justify-between text-[#62666F] mb-3">
              <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#62666F]">
                Safety Score
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-2xl bg-purple-50 text-purple-600">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="font-heading text-3xl sm:text-4xl font-black text-purple-700">99.4%</div>
            <p className="mt-1 text-[11px] text-[#62666F]">Verified transaction rate</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="rounded-4xl border border-[#E8E8E8] bg-white p-6 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E8E8E8] pb-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('moderation')}
                className={`rounded-full px-5 py-2 text-xs font-heading font-bold uppercase tracking-wider transition ${activeTab === 'moderation'
                  ? 'bg-[#0638C9] text-white shadow-sm'
                  : 'bg-[#F5F5F2] text-[#62666F] hover:bg-[#E8E8E8] hover:text-[#111111]'
                  }`}
              >
                Product Moderation ({products.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reported')}
                className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-heading font-bold uppercase tracking-wider transition ${activeTab === 'reported'
                  ? 'bg-[#0638C9] text-white shadow-sm'
                  : 'bg-[#F5F5F2] text-[#62666F] hover:bg-[#E8E8E8] hover:text-[#111111]'
                  }`}
              >
                <span>Reported Listings</span>
                {reports.length > 0 && (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white">
                    {reports.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`rounded-full px-5 py-2 text-xs font-heading font-bold uppercase tracking-wider transition ${activeTab === 'users'
                  ? 'bg-[#0638C9] text-white shadow-sm'
                  : 'bg-[#F5F5F2] text-[#62666F] hover:bg-[#E8E8E8] hover:text-[#111111]'
                  }`}
              >
                User Management ({users.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('commission')}
                className={`rounded-full px-5 py-2 text-xs font-heading font-bold uppercase tracking-wider transition ${activeTab === 'commission'
                  ? 'bg-[#0638C9] text-white shadow-sm'
                  : 'bg-[#F5F5F2] text-[#62666F] hover:bg-[#E8E8E8] hover:text-[#111111]'
                  }`}
              >
                Commission & Ledger ({transactions.length})
              </button>
            </div>

            {/* Quick search input */}
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#62666F]" />
              <input
                type="text"
                placeholder="Search..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full rounded-full border border-[#E8E8E8] py-2 pl-9 pr-3 text-xs text-[#111111] placeholder:text-[#62666F]/60 focus:border-[#0638C9] focus:outline-none focus:ring-2 focus:ring-[#0638C9]/20"
              />
            </div>
          </div>

          {/* TAB 1: Product Moderation */}
          {activeTab === 'moderation' && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/60 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Product</th>
                    <th className="py-3 px-3">Price</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Seller</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products
                    .filter((p) =>
                      searchFilter
                        ? p.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
                        p.seller?.name?.toLowerCase().includes(searchFilter.toLowerCase())
                        : true
                    )
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={getProductImageUrl(item)}
                              alt=""
                              className="h-10 w-10 rounded-xl object-cover"
                              onError={(e) => {
                                if (e.currentTarget.src !== DEFAULT_PRODUCT_IMAGE) {
                                  e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                                }
                              }}
                            />
                            <div className="max-w-[200px]">
                              <p className="font-bold text-slate-900 truncate">{item.title}</p>
                              <p className="text-[11px] text-slate-400 truncate">{item.location}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-extrabold text-[#0638C9]">{formatINR(item.price)}</td>
                        <td className="py-3 px-3">
                          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {item.categoryName}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-800">{item.seller?.name}</p>
                          <p className="text-[10px] text-slate-400">{item.seller?.email}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${item.status === 'Sold'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-emerald-50 text-emerald-700'
                              }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApproveProduct(item)}
                              title="Approve / Verify"
                              className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveProduct(item.id)}
                              title="Take down listing"
                              className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: Reported Listings */}
          {activeTab === 'reported' && (
            <div className="mt-4">
              {reports.length > 0 ? (
                <div className="space-y-3">
                  {reports.map((rep) => (
                    <div
                      key={rep.id}
                      className="flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50/40 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                            {rep.severity} Severity
                          </span>
                          <span className="text-xs font-bold text-slate-900">{rep.reason}</span>
                        </div>
                        <h4 className="mt-1 text-sm font-black text-slate-900">
                          {rep.productTitle}
                        </h4>
                        <p className="mt-1 text-xs text-slate-600">
                          <span className="font-semibold">Seller:</span> {rep.sellerName} &bull;{' '}
                          <span className="font-semibold">Reported by:</span> {rep.reportedBy}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500 italic">"{rep.details}"</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDismissReport(rep.id)}
                          className="text-xs"
                        >
                          Dismiss Report
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleRemoveProduct(rep.productId, rep.id)}
                          className="text-xs"
                        >
                          Remove Listing
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No Pending Reports"
                  description="The campus moderation queue is clear. All reported items have been handled."
                />
              )}
            </div>
          )}

          {/* TAB 3: User Management */}
          {activeTab === 'users' && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/60 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Student Name</th>
                    <th className="py-3 px-3">University Email</th>
                    <th className="py-3 px-3">College / Major</th>
                    <th className="py-3 px-3">Account Role</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users
                    .filter((u) =>
                      searchFilter
                        ? `${u.firstName} ${u.lastName}`
                          .toLowerCase()
                          .includes(searchFilter.toLowerCase()) ||
                        u.email.toLowerCase().includes(searchFilter.toLowerCase())
                        : true
                    )
                    .map((usr) => (
                      <tr key={usr.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            {usr.avatarUrl ? (
                              <img
                                src={usr.avatarUrl}
                                alt=""
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                                {usr.firstName?.[0] || 'U'}
                              </span>
                            )}
                            <span className="font-bold text-slate-900">
                              {usr.firstName} {usr.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{usr.email}</td>
                        <td className="py-3 px-3 text-slate-600">
                          {usr.college} {usr.major ? `(${usr.major})` : ''}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${usr.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-700'
                              }`}
                          >
                            {usr.role || 'Student'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${usr.status === 'Suspended'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-50 text-emerald-700'
                              }`}
                          >
                            {usr.status || 'Active'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Button
                            size="sm"
                            variant={usr.status === 'Suspended' ? 'outline' : 'ghost'}
                            icon={usr.status === 'Suspended' ? UserCheck : UserX}
                            onClick={() => handleToggleUserStatus(usr)}
                            className={`text-xs ${usr.status === 'Suspended'
                              ? 'text-emerald-700 border-emerald-300'
                              : 'text-red-600 hover:bg-red-50'
                              }`}
                          >
                            {usr.status === 'Suspended' ? 'Reactivate' : 'Suspend'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: Commission & Platform Ledger */}
          {activeTab === 'commission' && (
            <div className="mt-4 space-y-4">
              {/* Honest Backend Disclosure Alert */}
              <div className="rounded-3xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-[#0638C9] shrink-0 mt-0.5" />
                <div>
                  <p className="font-heading font-black uppercase tracking-wider text-[11px] text-[#0638C9]">
                    TIET Marketplace Commission Policy & Backend Integration Disclosure
                  </p>
                  <p className="mt-0.5 text-blue-800 leading-relaxed">
                    A flat <strong>5% platform fee</strong> is deducted from gross seller proceeds upon completed campus transactions to fund trust verification and escrow maintenance.
                    <br />
                    <em>Backend Note:</em> The existing Express backend does not currently have endpoints for <code>/api/transactions</code> or <code>/api/commission</code>. All ledger transactions, seller payouts, and 5% fee records are managed via CampusKart's reactive persistence service.
                  </p>
                </div>
              </div>

              {/* Transactions Ledger Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/60 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-3">Txn ID</th>
                      <th className="py-3 px-3">Item</th>
                      <th className="py-3 px-3">Buyer & Seller</th>
                      <th className="py-3 px-3 text-right">Agreed Price</th>
                      <th className="py-3 px-3 text-right">5% Fee</th>
                      <th className="py-3 px-3 text-right">Net Seller Payout</th>
                      <th className="py-3 px-3">Payment Mode</th>
                      <th className="py-3 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-slate-400">
                          No transactions recorded yet in this semester.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-3 font-mono font-bold text-slate-700">{t.id}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              {t.productImage && (
                                <img
                                  src={getProductImageUrl(t)}
                                  alt=""
                                  className="h-8 w-8 rounded-lg object-cover border border-slate-200"
                                  onError={(e) => {
                                    if (e.currentTarget.src !== DEFAULT_PRODUCT_IMAGE) {
                                      e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                                    }
                                  }}
                                />
                              )}
                              <span className="font-bold text-slate-900 max-w-[180px] truncate">
                                {t.productTitle}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-medium text-slate-800">
                              <span className="text-slate-400 text-[10px]">Buyer:</span> {t.buyerName}
                            </p>
                            <p className="font-medium text-slate-600">
                              <span className="text-slate-400 text-[10px]">Seller:</span> {t.sellerName}
                            </p>
                          </td>
                          <td className="py-3 px-3 text-right font-extrabold text-slate-900">
                            {formatINR(t.amount)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-amber-700">
                            {formatINR(t.commissionAmount || (t.amount * 0.05))}
                          </td>
                          <td className="py-3 px-3 text-right font-extrabold text-emerald-700">
                            {formatINR(t.sellerAmount || (t.amount * 0.95))}
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-600">{t.paymentMethod}</td>
                          <td className="py-3 px-3">
                            <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-heading font-extrabold uppercase">
                              {t.transactionStatus || 'COMPLETED'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

