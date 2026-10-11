import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Send,
  Trash2,
  RefreshCw,
  LogOut,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Inbox,
  ArrowLeft,
  Paperclip,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  getCurrentUser,
  getAccessToken,
} from '../services/googleAuth';
import {
  listGmailMessages,
  getGmailMessageDetail,
  sendGmailEmail,
  trashGmailMessage,
  markGmailAsRead,
  getGmailProfile,
  GmailMessageSummary,
  GmailMessageDetail,
  GmailProfile,
} from '../services/gmailService';
import { useStore } from '../context/StoreContext';

interface GmailPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRecipient?: string;
  initialSubject?: string;
  initialBody?: string;
}

export const GmailPortalModal: React.FC<GmailPortalModalProps> = ({
  isOpen,
  onClose,
  initialRecipient = '',
  initialSubject = '',
  initialBody = '',
}) => {
  const { currentShop, language } = useStore();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<GmailProfile | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState<'inbox' | 'compose'>('inbox');
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<GmailMessageDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Compose State
  const [recipient, setRecipient] = useState(initialRecipient);
  const [subject, setSubject] = useState(initialSubject);
  const [bodyText, setBodyText] = useState(initialBody);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Mandatory User Confirmation Dialog State (as per Workspace integration rules)
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    confirmAction: () => Promise<void>;
  } | null>(null);

  // Check auth state on mount and open
  useEffect(() => {
    if (isOpen) {
      initAuth(
        (user, token) => {
          setIsAuthenticated(true);
          setCurrentUserEmail(user.email);
          loadProfileAndMessages();
        },
        () => {
          setIsAuthenticated(false);
          setCurrentUserEmail(null);
          setProfile(null);
        }
      );
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialRecipient || initialSubject || initialBody) {
      if (initialRecipient) setRecipient(initialRecipient);
      if (initialSubject) setSubject(initialSubject);
      if (initialBody) setBodyText(initialBody);
      setActiveTab('compose');
    }
  }, [initialRecipient, initialSubject, initialBody]);

  const loadProfileAndMessages = async () => {
    setIsLoadingMessages(true);
    setStatusMessage(null);
    try {
      const [prof, list] = await Promise.all([
        getGmailProfile(),
        listGmailMessages(searchQuery),
      ]);
      if (prof) setProfile(prof);
      setMessages(list);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Hitilafu ya kupakia barua pepe.' });
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setIsAuthenticated(true);
        setCurrentUserEmail(res.user.email);
        loadProfileAndMessages();
      }
    } catch (err: any) {
      setLoginError(err.message || 'Haikuweza kuingia na Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logoutGoogle();
    setIsAuthenticated(false);
    setCurrentUserEmail(null);
    setProfile(null);
    setMessages([]);
    setSelectedMessage(null);
  };

  // Open email detail
  const handleOpenMessage = async (summary: GmailMessageSummary) => {
    setIsLoadingDetail(true);
    setStatusMessage(null);
    try {
      const detail = await getGmailMessageDetail(summary.id);
      setSelectedMessage(detail);
      if (summary.isUnread) {
        markGmailAsRead(summary.id);
        // mark local as read
        setMessages((prev) =>
          prev.map((m) => (m.id === summary.id ? { ...m, isUnread: false } : m))
        );
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Haikuweza kufungua ujumbe.' });
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Request user confirmation before sending email (MANDATORY Workspace rule)
  const handleInitiateSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim() || !subject.trim() || !bodyText.trim()) {
      setStatusMessage({ type: 'error', text: 'Tafadhali jaza barua pepe ya mteja, mada na ujumbe.' });
      return;
    }

    setConfirmationDialog({
      isOpen: true,
      title: 'Thibitisha Kutuma Barua Pepe',
      description: `Je, una uhakika unataka kutuma barua pepe hii kupitia akaunti yako ya Gmail kwenda kwa "${recipient}" yenye mada "${subject}"?`,
      confirmText: 'Ndio, Tuma Sasa',
      confirmAction: async () => {
        setIsSending(true);
        setStatusMessage(null);
        try {
          const res = await sendGmailEmail({
            to: recipient.trim(),
            subject: subject.trim(),
            body: bodyText.trim(),
            fromName: currentShop.name,
          });
          if (res.success) {
            setStatusMessage({ type: 'success', text: `Barua pepe imetumwa kikamilifu kwa ${recipient}!` });
            setRecipient('');
            setSubject('');
            setBodyText('');
            setActiveTab('inbox');
            loadProfileAndMessages();
          }
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: err.message || 'Hitilafu ya kutuma barua pepe.' });
        } finally {
          setIsSending(false);
          setConfirmationDialog(null);
        }
      },
    });
  };

  // Request user confirmation before deleting email (MANDATORY Workspace rule)
  const handleInitiateTrash = (messageId: string, messageSubject: string) => {
    setConfirmationDialog({
      isOpen: true,
      title: 'Futa Ujumbe Kwenye Gmail',
      description: `Je, una uhakika unataka kuhamisha ujumbe "${messageSubject || '(Bila Kichwa)'}" kwenye Jalala (Trash)? Hatua hii itafuta barua pepe kwenye kikasha chako.`,
      confirmText: 'Futa Ujumbe',
      confirmAction: async () => {
        try {
          const ok = await trashGmailMessage(messageId);
          if (ok) {
            setStatusMessage({ type: 'success', text: 'Ujumbe umehamishwa kwenye Jalala (Trash).' });
            setSelectedMessage(null);
            setMessages((prev) => prev.filter((m) => m.id !== messageId));
          } else {
            setStatusMessage({ type: 'error', text: 'Haikuweza kufuta ujumbe.' });
          }
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: err.message || 'Hitilafu ya kufuta ujumbe.' });
        } finally {
          setConfirmationDialog(null);
        }
      },
    });
  };

  // Quick email templates for Odry Studio Kenya builders & agencies
  const applyTemplate = (type: 'receipt' | 'dispatch' | 'inquiry_reply') => {
    if (type === 'receipt') {
      setSubject(`Live App & Website Preview Ready — Built with Odry Studio Kenya`);
      setBodyText(
        `Habari,\n\nMradi wako wa kidijitali umejengwa na uko tayari kwa ukaguzi kupitia Odry Studio — AI Website & App Builder Kenya (${currentShop.name}).\n\nUnaweza kuufungua kwenye simu ya Android, kompyuta kibao (Tablet), au Desktop na kuupima moja kwa moja.\n\nSimu/WhatsApp: ${currentShop.phoneNumber}\nOfisi/Mahali: ${currentShop.location}\n\nKila la heri,\n${currentShop.name} • Odry Studio Kenya`
      );
    } else if (type === 'dispatch') {
      setSubject(`Quotation & Proposal: Website / App Development — ${currentShop.name}`);
      setBodyText(
        `Habari mteja wetu,\n\nAsante kwa kuwasiliana na ${currentShop.name} (Odry Studio Kenya).\n\nTumeandaa mpango kamili wa kujenga mfumo wako (Website / Mobile App / Booking System / Business Management ERP) ukiwa na muunganisho wa M-Pesa na muundo wa kisasa.\n\nKwa maelezo zaidi au kuona demo ya moja kwa moja, tupigie au WhatsApp: ${currentShop.phoneNumber}.\n\nAsante kwa kutuamini!`
      );
    } else if (type === 'inquiry_reply') {
      setSubject(`System Deployment & Live Hosting Update — ${currentShop.name}`);
      setBodyText(
        `Habari,\n\nTovuti na mfumo wako uliotengenezwa kwenye Odry Studio Kenya sasa umechapishwa (Published Live) na unapatikana mtandaoni.\n\nKwa maboresho yoyote ya ziada au msaada wa kiufundi, wasiliana nasi kwa WhatsApp: ${currentShop.phoneNumber}.\n\nKaribu sana!`
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl overflow-hidden border border-gray-100 my-6 flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-red-600 via-rose-700 to-red-800 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-red-600 shadow-md">
              <Mail className="h-6 w-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">Odry Studio Workspace Mail (Gmail)</h3>
                <span className="rounded-md bg-white/20 text-white font-bold text-[10px] px-2 py-0.5 uppercase tracking-wider">
                  Google Workspace
                </span>
              </div>
              <p className="text-xs text-red-100">
                Tuma viungo vya miradi (Live App Links), mapendekezo ya mifumo, na wasiliana na wateja wako Kenya
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <>
                <button
                  type="button"
                  onClick={loadProfileAndMessages}
                  disabled={isLoadingMessages}
                  className="rounded-xl p-2 text-red-100 hover:bg-white/10 hover:text-white transition"
                  title="Refresh Gmail"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingMessages ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl p-2 text-red-200 hover:bg-white/10 hover:text-white transition flex items-center gap-1 text-xs"
                  title="Ondoka Google"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Toka</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-red-100 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STATE 1: NOT AUTHENTICATED -> SHOW OFFICIAL GOOGLE SIGN-IN */}
          {!isAuthenticated ? (
            <div className="py-8 max-w-md mx-auto text-center space-y-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 text-red-600 border border-red-100">
                <Mail className="h-10 w-10" />
              </div>

              <div className="space-y-2">
                <h4 className="text-xl font-black text-gray-900">
                  Unganisha Gmail na Odry Studio ({currentShop.name})
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Ingia kwa usalama na akaunti yako ya Google kutuma viungo vya tovuti na apps ulizojenga, ripoti za miradi, na kusoma barua pepe za wateja moja kwa moja ndani ya Odry Studio Kenya.
                </p>
              </div>

              {/* Official Google Sign-In Material Button */}
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  disabled={isLoggingIn}
                  onClick={handleGoogleSignIn}
                  className="flex items-center justify-center gap-3 rounded-2xl border-2 border-gray-200 bg-white px-6 py-3.5 text-sm font-bold text-gray-800 shadow-md hover:bg-gray-50 hover:border-gray-300 transition active:scale-98 disabled:opacity-50"
                >
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="h-5 w-5 shrink-0"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                  <span>{isLoggingIn ? 'Inafungua Google...' : 'Ingia na Google (Sign in with Google)'}</span>
                </button>
              </div>

              {loginError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-4 border-t border-gray-100 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Tuma risiti za agizo kwa barua pepe</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Soma barua pepe za maswali ya wateja</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Uthibitisho wa 100% kabla ya kutuma</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Usalama wa Google OAuth 2.0</span>
                </div>
              </div>
            </div>
          ) : (
            /* STATE 2: AUTHENTICATED -> GMAIL CLIENT VIEW */
            <div className="space-y-4">
              {/* Profile Bar */}
              <div className="rounded-2xl bg-gray-50 border border-gray-200 p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white font-extrabold text-sm shadow-xs">
                    {currentUserEmail ? currentUserEmail.charAt(0).toUpperCase() : 'G'}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">
                      {currentUserEmail || 'Gmail Account'}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Gmail Imeunganishwa Kikamilifu
                    </span>
                  </div>
                </div>

                {profile && (
                  <div className="text-[11px] text-gray-500 font-medium hidden sm:block">
                    Jumla ya barua pepe: <strong className="text-gray-800">{profile.messagesTotal.toLocaleString()}</strong>
                  </div>
                )}
              </div>

              {/* Status Banner */}
              {statusMessage && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between ${
                    statusMessage.type === 'success'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-rose-100 text-rose-900 border border-rose-300'
                  }`}
                >
                  <span>{statusMessage.text}</span>
                  <button onClick={() => setStatusMessage(null)} className="p-1 hover:bg-black/10 rounded">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Navigation Tabs */}
              <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('inbox');
                      setSelectedMessage(null);
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition ${
                      activeTab === 'inbox' && !selectedMessage
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Inbox className="h-4 w-4" />
                    <span>Kikasha (Inbox)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('compose');
                      setSelectedMessage(null);
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition ${
                      activeTab === 'compose'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Send className="h-4 w-4" />
                    <span>Andika Barua Pepe (Compose)</span>
                  </button>
                </div>

                {activeTab === 'inbox' && !selectedMessage && (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && loadProfileAndMessages()}
                      placeholder="Tafuta barua pepe..."
                      className="rounded-xl border border-gray-200 bg-gray-50 pl-8 pr-3 py-1.5 text-xs font-medium focus:bg-white focus:border-red-600 outline-none w-44 sm:w-60"
                    />
                  </div>
                )}
              </div>

              {/* TAB 1: INBOX LIST */}
              {activeTab === 'inbox' && !selectedMessage && (
                <div className="space-y-2">
                  {isLoadingMessages ? (
                    <div className="text-center py-12 text-gray-500 text-xs font-semibold">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-red-600 mb-2" />
                      Inapakia barua pepe zako za Gmail...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-3xl p-6">
                      <Inbox className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-gray-700">Hakuna barua pepe zilizopatikana.</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Barua pepe za wateja zitaonekana hapa pindi zitakapowasili.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-2xs">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          onClick={() => handleOpenMessage(msg)}
                          className={`p-3.5 hover:bg-red-50/40 cursor-pointer transition flex items-center justify-between gap-3 ${
                            msg.isUnread ? 'bg-amber-50/30 font-bold' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {msg.isUnread ? (
                              <span className="h-2 w-2 rounded-full bg-red-600 shrink-0"></span>
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-transparent shrink-0"></span>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-xs truncate block ${msg.isUnread ? 'text-gray-900 font-extrabold' : 'text-gray-700 font-semibold'}`}>
                                  {msg.from.replace(/<.*>/, '').trim() || msg.from}
                                </span>
                                <span className="text-[10px] text-gray-400 shrink-0">
                                  {msg.date ? new Date(msg.date).toLocaleDateString() : ''}
                                </span>
                              </div>
                              <p className={`text-xs truncate ${msg.isUnread ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
                                {msg.subject}
                              </p>
                              <p className="text-[11px] text-gray-400 truncate mt-0.5 font-normal">
                                {msg.snippet}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* MESSAGE DETAIL VIEW */}
              {activeTab === 'inbox' && selectedMessage && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <button
                      type="button"
                      onClick={() => setSelectedMessage(null)}
                      className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Rudi kwenye Kikasha</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRecipient(selectedMessage.headers['reply-to'] || selectedMessage.from);
                          setSubject(`Re: ${selectedMessage.subject}`);
                          setBodyText(`\n\n--- Ujumbe wa Awali ---\n${selectedMessage.body.slice(0, 300)}...`);
                          setActiveTab('compose');
                          setSelectedMessage(null);
                        }}
                        className="rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 transition"
                      >
                        Jibu (Reply)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleInitiateTrash(selectedMessage.id, selectedMessage.subject)}
                        className="rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700 transition flex items-center gap-1"
                        title="Futa Ujumbe (Delete)"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Futa</span>
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
                    <div>
                      <h4 className="text-base font-extrabold text-gray-900">{selectedMessage.subject}</h4>
                      <div className="flex items-center justify-between text-xs text-gray-500 mt-1 flex-wrap gap-2">
                        <span><strong>Kutoka:</strong> {selectedMessage.from}</span>
                        <span>{selectedMessage.date}</span>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-3 text-xs text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
                      {selectedMessage.body}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: COMPOSE EMAIL */}
              {activeTab === 'compose' && (
                <div className="space-y-4">
                  {/* Preset Studio Templates */}
                  <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-3.5 space-y-2">
                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
                      ⚡ Violezo vya Haraka vya Odry Studio Kenya (Client Email Templates):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => applyTemplate('receipt')}
                        className="rounded-xl bg-white border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-100 transition shadow-2xs"
                      >
                        🚀 Tuma Live App/Website Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTemplate('dispatch')}
                        className="rounded-xl bg-white border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-100 transition shadow-2xs"
                      >
                        📄 Pendekezo la Mradi (Project Proposal)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTemplate('inquiry_reply')}
                        className="rounded-xl bg-white border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-100 transition shadow-2xs"
                      >
                        🌐 Taarifa ya Kuchapisha (Deployment Update)
                      </button>
                    </div>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleInitiateSend} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Barua Pepe ya Mpokeaji (Recipient Email)
                      </label>
                      <input
                        type="email"
                        required
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="mteja@gmail.com"
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-medium focus:border-red-600 focus:ring-2 focus:ring-red-500/20 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Mada ya Barua Pepe (Subject)
                      </label>
                      <input
                        type="text"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="k.m. Risiti ya Malipo ya Agizo #1042"
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-medium focus:border-red-600 focus:ring-2 focus:ring-red-500/20 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Ujumbe (Message Body)
                      </label>
                      <textarea
                        rows={7}
                        required
                        value={bodyText}
                        onChange={(e) => setBodyText(e.target.value)}
                        placeholder="Andika ujumbe wako hapa..."
                        className="w-full rounded-2xl border border-gray-300 bg-white p-4 text-xs font-medium focus:border-red-600 focus:ring-2 focus:ring-red-500/20 outline-none resize-none leading-relaxed"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSending}
                      className="w-full rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold py-3.5 text-sm shadow-md transition flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      <span>{isSending ? 'Inatuma...' : 'Kagua na Utume Barua Pepe (Send via Gmail)'}</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MANDATORY USER CONFIRMATION DIALOG (Workspace Safety Rule) */}
        {confirmationDialog && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-200 space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <h4 className="text-base font-extrabold text-gray-900">
                  {confirmationDialog.title}
                </h4>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                {confirmationDialog.description}
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmationDialog(null)}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
                >
                  Ghairi (Cancel)
                </button>
                <button
                  type="button"
                  onClick={confirmationDialog.confirmAction}
                  className="rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-bold shadow-xs transition"
                >
                  {confirmationDialog.confirmText}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
