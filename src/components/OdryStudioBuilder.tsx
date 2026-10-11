import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Globe,
  Smartphone,
  Layout,
  Calendar,
  Briefcase,
  Sparkles,
  Code2,
  Eye,
  Columns,
  Sliders,
  Monitor,
  Tablet,
  Save,
  Rocket,
  Copy,
  Trash2,
  FolderOpen,
  Plus,
  Check,
  ExternalLink,
  FileCode,
  RefreshCw,
  Wand2,
  AlertCircle,
  CheckCircle2,
  Layers,
  Search,
  Coins,
  ArrowRight,
  Terminal,
  Download,
  MessageSquare,
  Send,
  Crown,
  ChevronRight,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import {
  BuilderProject,
  BuilderProjectType,
  DesignPreferences,
  ProjectFile,
  ResponsiveViewport,
  StudioChatMessage,
  StudioViewMode,
} from '../types';
import {
  generateStudioProjectWithAI,
  saveStudioProjectChanges,
  duplicateStudioProject,
  deleteStudioProject,
  publishStudioProject,
} from '../services/studioService';
import { useStore } from '../context/StoreContext';

interface OdryStudioBuilderProps {
  studioView: StudioViewMode;
  onSelectStudioView: (view: StudioViewMode) => void;
  projects: BuilderProject[];
  setProjects: React.Dispatch<React.SetStateAction<BuilderProject[]>>;
  activeProjectId: string | null;
  setActiveProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  tokenBalance: number;
  setTokenBalance: React.Dispatch<React.SetStateAction<number>>;
  isLoadingProjects: boolean;
  onOpenSubscriptionModal: () => void;
}

interface ProjectOptionConfig {
  type: BuilderProjectType;
  title: string;
  titleSw: string;
  subtitle: string;
  subtitleSw: string;
  categoryLabel: string;
  icon: React.FC<{ className?: string }>;
  defaultFeatures: string[];
  samplePrompts: string[];
}

export const PROJECT_OPTIONS: ProjectOptionConfig[] = [
  {
    type: 'website',
    title: 'Build a Website',
    titleSw: 'Jenga Tovuti (Website)',
    subtitle:
      'Corporate websites, real estate portals, hospitality & safari platforms, NGOs, and modern landing pages.',
    subtitleSw:
      'Tovuti za kampuni, real estate, hoteli, utalii, NGO na kurasa za kisasa za biashara.',
    categoryLabel: 'Web & Landing Pages',
    icon: Globe,
    defaultFeatures: [
      'Responsive Mobile Navigation',
      'Contact & Lead Capture Form',
      'M-Pesa Payment & Till Integration UI',
      'Dark & Light Mode Support',
    ],
    samplePrompts: [
      'Create a modern architecture and real estate development website in Nairobi with an interactive property portfolio, mortgage calculator in KES, client testimonials, and site visit booking form.',
      'Build a clean solar & renewable energy company website with an interactive power savings calculator, commercial installation packages, and instant quote request form.',
      'Build a luxury safari & coastal resort website with interactive itinerary packages, resident/non-resident rates, photo gallery, and instant inquiry form.',
    ],
  },
  {
    type: 'mobile_app',
    title: 'Build a Mobile App',
    titleSw: 'Jenga Programu ya Simu (Mobile App)',
    subtitle:
      'Touch-first Android & iOS mobile app interfaces for fintech, SACCOs, Chamas, delivery, fitness, and field teams.',
    subtitleSw:
      'Programu za simu za Android na iOS kwa ajili ya fintech, SACCO, Chama, usafiri na huduma za kisasa.',
    categoryLabel: 'Android & iOS Apps',
    icon: Smartphone,
    defaultFeatures: [
      'Responsive Mobile Navigation',
      'M-Pesa Payment & Till Integration UI',
      'User Authentication & Profiles',
      'Offline-Ready Local State',
    ],
    samplePrompts: [
      'Create a Chama & SACCO mobile app with monthly member contribution tracking, instant loan eligibility & interest calculator, statement ledger, and meeting RSVP alerts.',
      'Build an on-demand parcel & rider dispatch mobile app with route fare estimation, live package tracking status, driver rating, and trip history.',
      'Build a personal finance & budget tracker mobile app with daily expense categories, debt payoff planner, savings goals, and weekly visual analytics.',
    ],
  },
  {
    type: 'web_app',
    title: 'Build a Web Application',
    titleSw: 'Jenga Mfumo wa Mtandaoni (Web App)',
    subtitle:
      'Interactive SaaS platforms, property management portals, invoice & tax tools, client portals, and data-driven web apps.',
    subtitleSw:
      'Mifumo ya SaaS, usimamizi wa nyumba (Rentals), ankara na programu kamili za mtandaoni.',
    categoryLabel: 'Interactive SaaS',
    icon: Layout,
    defaultFeatures: [
      'User Authentication & Profiles',
      'KES Currency & Tax (VAT) Formatting',
      'Analytics & KPI Charts',
      'Data Export (CSV / Print)',
    ],
    samplePrompts: [
      'Build a Rental & Property Management web application for landlords and property managers to track apartment units, monthly rent collection, utility bills, and tenant receipts.',
      'Create a Freelancer & SME Invoice Generator web app with 16% VAT calculation, multi-currency/KES formatting, printable invoices, and client revenue charts.',
      'Build an AgriTech produce aggregation web app connecting farmers with commercial buyers, featuring live wholesale prices and logistics scheduling.',
    ],
  },
  {
    type: 'booking_system',
    title: 'Build a Booking System',
    titleSw: 'Jenga Mfumo wa Miadi (Booking System)',
    subtitle:
      'Appointment scheduling, medical & dental clinic portals, spa reservations, shuttle ticketing, and venue booking systems.',
    subtitleSw:
      'Mfumo wa kuweka miadi ya hospitali, kliniki, saluni, usafiri, hoteli au ukumbi wa mikutano.',
    categoryLabel: 'Scheduling & Reservations',
    icon: Calendar,
    defaultFeatures: [
      'Booking & Scheduling Calendar',
      'M-Pesa Payment & Till Integration UI',
      'Multi-Step Form & Validation',
      'Real-Time Notifications',
    ],
    samplePrompts: [
      'Build a specialist medical & dental clinic appointment booking system with doctor selection, interactive time slot picker, consultation fee summary, and live patient queue.',
      'Create an executive shuttle & bus seat booking system with interactive seat map selection, departure time slots, fare summary, and printable ticket receipt.',
      'Build an executive conference center & co-working boardroom reservation system with hourly rates, equipment add-ons, and instant booking confirmation.',
    ],
  },
  {
    type: 'business_management',
    title: 'Build a Business Management System',
    titleSw: 'Jenga Mfumo wa Kusimamia Biashara',
    subtitle:
      'Enterprise ERP dashboards, HR & payroll calculators, school management portals, fleet tracking, and operations software.',
    subtitleSw:
      'Mfumo wa kusimamia wafanyakazi, mishahara (Payroll), shule, hospitali, magari na miradi ya kampuni.',
    categoryLabel: 'ERP & Operations',
    icon: Briefcase,
    defaultFeatures: [
      'Analytics & KPI Charts',
      'KES Currency & Tax (VAT) Formatting',
      'Role-Based Access Control',
      'Data Export (CSV / Print)',
    ],
    samplePrompts: [
      'Build a comprehensive School & College Management System with student admission records, term fee balance tracker, exam grade analytics, attendance logging, and printable statements.',
      'Create an HR & Payroll Management System with employee directory, statutory deductions (PAYE / SHIF / NSSF) calculator, leave request approvals, and monthly payroll summary export.',
      'Build a fleet & logistics Business Management System with vehicle dispatch tracking, fuel & maintenance expenses, client contracts, and KPI analytics.',
    ],
  },
  {
    type: 'custom_project',
    title: 'Build a Custom Project',
    titleSw: 'Jenga Mradi Maalum (Custom Project)',
    subtitle:
      'Describe any custom software architecture, financial calculator, internal tool, NGO tracker, or bespoke digital platform.',
    subtitleSw:
      'Eleza mradi wowote maalum (App, Website, Calculator au Mfumo) unaotaka kujenga kwa AI.',
    categoryLabel: 'Bespoke Architecture',
    icon: Sparkles,
    defaultFeatures: [
      'Responsive Mobile Navigation',
      'KES Currency & Tax (VAT) Formatting',
      'Search, Filtering & Sorting',
      'Data Export (CSV / Print)',
    ],
    samplePrompts: [
      'Build an interactive Real Estate ROI, Construction Cost & Mortgage Analyzer with dynamic sliders, rental yield comparison, and full amortization schedule.',
      'Create an Event & Wedding Planning Budget & RSVP Manager with committee pledge tracking, vendor payment milestones, guest table seating, and live attendance check-in.',
      'Build a Motor Vehicle Import Duty & Clearing Cost Calculator with CRSP valuation, excise duty, VAT, IDF, RDL, and registration fee breakdown.',
    ],
  },
];

const COLOR_PALETTES: Array<{
  id: DesignPreferences['colorPalette'];
  name: string;
  swatches: [string, string, string];
}> = [
  { id: 'indigo_slate', name: 'Violet & Deep Navy', swatches: ['#7c3aed', '#6366f1', '#070b19'] },
  { id: 'ocean_cyan', name: 'Electric Blue & Cobalt', swatches: ['#3b82f6', '#06b6d4', '#082f49'] },
  { id: 'emerald_mint', name: 'Emerald & Obsidian', swatches: ['#10b981', '#34d399', '#064e3b'] },
  { id: 'amber_obsidian', name: 'Amber & Carbon', swatches: ['#f59e0b', '#fbbf24', '#18181b'] },
  { id: 'rose_quartz', name: 'Crimson & Night', swatches: ['#f43f5e', '#fb7185', '#1f1218'] },
  { id: 'monochrome_ink', name: 'Monochrome Slate', swatches: ['#f8fafc', '#94a3b8', '#090d16'] },
];

const AVAILABLE_FEATURES: string[] = [
  'Responsive Mobile Navigation',
  'User Authentication & Profiles',
  'Booking & Scheduling Calendar',
  'Analytics & KPI Charts',
  'Multi-Step Form & Validation',
  'Search, Filtering & Sorting',
  'Dark & Light Mode Support',
  'Contact & Lead Capture Form',
  'Role-Based Access Control',
  'Real-Time Notifications',
  'Data Export (CSV / Print)',
  'Offline-Ready Local State',
  'M-Pesa Payment & Till Integration UI',
  'KES Currency & Tax (VAT) Formatting',
];

function assembleLivePreviewDocument(files: ProjectFile[]): string {
  const htmlFile =
    files.find((f) => f.path.endsWith('.html')) ||
    files[0] || {
      path: 'index.html',
      language: 'html',
      content: '<div style="padding:2rem;font-family:sans-serif">No HTML file found.</div>',
    };
  const cssFiles = files.filter((f) => f.path.endsWith('.css'));
  const jsFiles = files.filter((f) => f.path.endsWith('.js'));

  let doc = htmlFile.content;
  const combinedCss = cssFiles.map((f) => `/* ${f.path} */\n${f.content}`).join('\n\n');
  const combinedJs = jsFiles.map((f) => `// ${f.path}\n${f.content}`).join('\n\n');

  if (combinedCss.trim()) {
    if (doc.includes('</head>')) {
      doc = doc.replace('</head>', `<style>\n${combinedCss}\n</style>\n</head>`);
    } else {
      doc = `<style>\n${combinedCss}\n</style>\n` + doc;
    }
  }

  if (combinedJs.trim()) {
    if (doc.includes('</body>')) {
      doc = doc.replace(
        '</body>',
        `<script>\ntry {\n${combinedJs}\n} catch(e) { console.error(e); }\n</script>\n</body>`
      );
    } else {
      doc = doc + `\n<script>\ntry {\n${combinedJs}\n} catch(e) { console.error(e); }\n</script>`;
    }
  }

  return doc;
}

export const OdryStudioBuilder: React.FC<OdryStudioBuilderProps> = ({
  studioView,
  onSelectStudioView,
  projects,
  setProjects,
  activeProjectId,
  setActiveProjectId,
  tokenBalance,
  setTokenBalance,
  isLoadingProjects,
  onOpenSubscriptionModal,
}) => {
  const {
    language,
    currentShop,
    subscriptionDaysRemaining,
    showSubscriptionPlan,
  } = useStore();

  const promptInputRef = useRef<HTMLTextAreaElement | null>(null);
  const featuresSectionRef = useRef<HTMLElement | null>(null);

  // New Project Configurator State
  const [selectedType, setSelectedType] = useState<BuilderProjectType>('website');
  const [projectName, setProjectName] = useState<string>('');
  const [projectDescription, setProjectDescription] = useState<string>('');
  const [showAdvancedConfig, setShowAdvancedConfig] = useState<boolean>(false);
  const [designPreferences, setDesignPreferences] = useState<DesignPreferences>({
    colorPalette: 'indigo_slate',
    themeMode: 'dark',
    typography: 'modern_sans',
    layoutDensity: 'comfortable',
  });
  const [requiredFeatures, setRequiredFeatures] = useState<string[]>([
    'Responsive Mobile Navigation',
    'Contact & Lead Capture Form',
    'Dark & Light Mode Support',
  ]);
  const [customFeatureInput, setCustomFeatureInput] = useState<string>('');

  // Generation & Feedback State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Workspace State
  const [workspaceMode, setWorkspaceMode] = useState<'preview' | 'code' | 'split' | 'design'>('preview');
  const [viewport, setViewport] = useState<ResponsiveViewport>('desktop');
  const [selectedFilePath, setSelectedFilePath] = useState<string>('index.html');
  const [unsavedFiles, setUnsavedFiles] = useState<ProjectFile[] | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [refinementPrompt, setRefinementPrompt] = useState<string>('');
  const [previewKey, setPreviewKey] = useState<number>(1);
  const [newFileName, setNewFileName] = useState<string>('');
  const [isAddingFile, setIsAddingFile] = useState<boolean>(false);

  // Workspace AI Chat History per project ID
  const [chatHistoryByProject, setChatHistoryByProject] = useState<
    Record<string, StudioChatMessage[]>
  >({});

  // Publish State
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [customSlugInput, setCustomSlugInput] = useState<string>('');
  const [copiedSlugId, setCopiedSlugId] = useState<string | null>(null);

  // Project Management Filter State
  const [projectSearch, setProjectSearch] = useState<string>('');
  const [projectTypeFilter, setProjectTypeFilter] = useState<BuilderProjectType | 'all'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const activeProject = useMemo(() => {
    if (!activeProjectId) return projects[0] || null;
    return projects.find((p) => p.id === activeProjectId) || projects[0] || null;
  }, [projects, activeProjectId]);

  useEffect(() => {
    if (activeProject) {
      setUnsavedFiles(null);
      setCustomSlugInput(activeProject.publishedSlug || '');
      const hasSelected = activeProject.files.some((f) => f.path === selectedFilePath);
      if (!hasSelected && activeProject.files.length > 0) {
        setSelectedFilePath(activeProject.files[0].path);
      }

      // Seed initial AI chat welcome message for the project if none exists
      setChatHistoryByProject((prev) => {
        if (prev[activeProject.id]) return prev;
        return {
          ...prev,
          [activeProject.id]: [
            {
              id: `msg_init_${activeProject.id}`,
              role: 'assistant',
              content: `Loaded "${activeProject.name}" (${activeProject.projectType.replace(
                /_/g,
                ' '
              )}). Describe any feature, layout change, or component you want me to build into your project files.`,
              timestamp: activeProject.updatedAt || new Date().toISOString(),
              filesUpdated: activeProject.files.map((f) => f.path),
            },
          ],
        };
      });
    }
  }, [activeProject?.id]);

  const workingFiles = useMemo(() => {
    if (unsavedFiles) return unsavedFiles;
    return activeProject?.files || [];
  }, [unsavedFiles, activeProject]);

  const activeFile = useMemo(() => {
    return (
      workingFiles.find((f) => f.path === selectedFilePath) ||
      workingFiles[0] || {
        path: 'index.html',
        language: 'html' as const,
        content: '',
      }
    );
  }, [workingFiles, selectedFilePath]);

  const previewHtmlDoc = useMemo(() => {
    return assembleLivePreviewDocument(workingFiles);
  }, [workingFiles, previewKey]);

  const activeChatMessages = useMemo(() => {
    if (!activeProject) return [];
    return chatHistoryByProject[activeProject.id] || [];
  }, [activeProject, chatHistoryByProject]);

  const handleSelectProjectTypeCard = (option: ProjectOptionConfig, focusPrompt = true) => {
    setSelectedType(option.type);
    setRequiredFeatures(option.defaultFeatures);
    if (!projectDescription.trim() && option.samplePrompts.length > 0) {
      setProjectDescription(option.samplePrompts[0]);
    }
    if (studioView !== 'dashboard') {
      onSelectStudioView('dashboard');
    }
    if (focusPrompt) {
      setTimeout(() => {
        promptInputRef.current?.focus();
      }, 80);
    }
  };

  const handleStartFreshNewProject = () => {
    setProjectName('');
    setProjectDescription('');
    setErrorBanner(null);
    setSuccessBanner(null);
    onSelectStudioView('dashboard');
    setTimeout(() => {
      promptInputRef.current?.focus();
    }, 80);
  };

  const toggleFeature = (feature: string) => {
    setRequiredFeatures((prev) =>
      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]
    );
  };

  const handleAddCustomFeature = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customFeatureInput.trim();
    if (!trimmed) return;
    if (!requiredFeatures.includes(trimmed)) {
      setRequiredFeatures((prev) => [...prev, trimmed]);
    }
    setCustomFeatureInput('');
  };

  const handleGenerateProject = async (isRefinement = false, customPromptOverride?: string) => {
    setErrorBanner(null);
    setSuccessBanner(null);

    const activeRefinementText = (customPromptOverride ?? refinementPrompt).trim();

    const targetName =
      isRefinement && activeProject
        ? activeProject.name
        : projectName.trim() ||
          PROJECT_OPTIONS.find((o) => o.type === selectedType)?.title.replace('Build a ', 'Odry ') ||
          'Odry Studio Project';

    const targetDesc =
      isRefinement && activeProject ? activeProject.description : projectDescription.trim();

    if (!targetDesc || targetDesc.length < 10) {
      setErrorBanner(
        language === 'sw'
          ? 'Tafadhali eleza kwa lugha ya kawaida kile unachotaka kujenga (angalau herufi 10).'
          : 'Please describe what you want to build in ordinary language (at least 10 characters).'
      );
      promptInputRef.current?.focus();
      return;
    }

    if (isRefinement && !activeRefinementText) {
      setErrorBanner(
        language === 'sw'
          ? 'Andika mabadiliko unayotaka AI ifanye kwenye mradi huu.'
          : 'Please enter a prompt in the AI Chat Panel to update your project.'
      );
      return;
    }

    // If refining in workspace, append user message to AI chat panel immediately
    if (isRefinement && activeProject) {
      const userMsg: StudioChatMessage = {
        id: `msg_u_${Date.now()}`,
        role: 'user',
        content: activeRefinementText,
        timestamp: new Date().toISOString(),
      };
      setChatHistoryByProject((prev) => ({
        ...prev,
        [activeProject.id]: [...(prev[activeProject.id] || []), userMsg],
      }));
    }

    setIsGenerating(true);
    setGenerationStatus(
      isRefinement
        ? 'Applying AI refinements to your project architecture and code...'
        : 'Architecting layout, UI components, and application logic with Odry Studio AI...'
    );

    try {
      const response = await generateStudioProjectWithAI({
        projectId: isRefinement && activeProject ? activeProject.id : undefined,
        name: targetName,
        projectType: isRefinement && activeProject ? activeProject.projectType : selectedType,
        description: targetDesc,
        designPreferences:
          isRefinement && activeProject ? activeProject.designPreferences : designPreferences,
        requiredFeatures:
          isRefinement && activeProject ? activeProject.requiredFeatures : requiredFeatures,
        refinementPrompt: isRefinement ? activeRefinementText : undefined,
        existingFiles: isRefinement ? workingFiles : undefined,
        merchantId: currentShop.id,
      });

      if (response.project) {
        const updatedProject = response.project;
        setProjects((prev) => {
          const exists = prev.some((p) => p.id === updatedProject.id);
          if (exists) {
            return prev.map((p) => (p.id === updatedProject.id ? updatedProject : p));
          }
          return [updatedProject, ...prev];
        });
        setActiveProjectId(updatedProject.id);
        setUnsavedFiles(null);
        setRefinementPrompt('');
        setPreviewKey((k) => k + 1);

        if (typeof response.tokenBalance === 'number') {
          setTokenBalance(response.tokenBalance);
        }

        // Record AI assistant message in chat history
        const aiMsg: StudioChatMessage = {
          id: `msg_a_${Date.now()}`,
          role: 'assistant',
          content: isRefinement
            ? `Updated "${updatedProject.name}" based on your request: "${activeRefinementText}". Live preview and source files have been refreshed.`
            : `Generated "${updatedProject.name}" (${updatedProject.projectType.replace(
                /_/g,
                ' '
              )}) with ${updatedProject.files.length} source files.`,
          timestamp: new Date().toISOString(),
          filesUpdated: updatedProject.files.map((f) => f.path),
        };
        setChatHistoryByProject((prev) => ({
          ...prev,
          [updatedProject.id]: [...(prev[updatedProject.id] || []), aiMsg],
        }));

        setSuccessBanner(
          isRefinement
            ? `AI updated "${updatedProject.name}".`
            : `Generated "${updatedProject.name}" with ${updatedProject.files.length} project files.`
        );
        onSelectStudioView('workspace');
      }
    } catch (err: any) {
      setErrorBanner(
        err?.message ||
          'AI generation encountered an error. Please check your prompt or token balance.'
      );
      if (isRefinement && activeProject) {
        const errMsg: StudioChatMessage = {
          id: `msg_err_${Date.now()}`,
          role: 'assistant',
          content: `Error applying changes: ${err?.message || 'Generation failed.'}`,
          timestamp: new Date().toISOString(),
        };
        setChatHistoryByProject((prev) => ({
          ...prev,
          [activeProject.id]: [...(prev[activeProject.id] || []), errMsg],
        }));
      }
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
    }
  };

  const handleUpdateFileContent = (newContent: string) => {
    const base = unsavedFiles ? [...unsavedFiles] : activeProject ? [...activeProject.files] : [];
    const idx = base.findIndex((f) => f.path === activeFile.path);
    if (idx >= 0) {
      base[idx] = { ...base[idx], content: newContent };
    } else {
      base.push({
        path: activeFile.path,
        language: activeFile.language,
        content: newContent,
      });
    }
    setUnsavedFiles(base);
  };

  const handleCreateNewFile = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = newFileName.trim();
    if (!raw) return;
    const ext = raw.split('.').pop()?.toLowerCase();
    const lang: ProjectFile['language'] =
      ext === 'css' ? 'css' : ext === 'js' ? 'javascript' : ext === 'json' ? 'json' : 'html';

    const base = unsavedFiles ? [...unsavedFiles] : activeProject ? [...activeProject.files] : [];
    if (!base.some((f) => f.path === raw)) {
      base.push({
        path: raw,
        language: lang,
        content:
          lang === 'css'
            ? `/* ${raw} */\n`
            : lang === 'javascript'
            ? `// ${raw}\n`
            : lang === 'json'
            ? `{\n  "file": "${raw}"\n}`
            : `<!-- ${raw} -->\n<div></div>`,
      });
      setUnsavedFiles(base);
    }
    setSelectedFilePath(raw);
    setNewFileName('');
    setIsAddingFile(false);
  };

  const handleSaveWorkspace = async () => {
    if (!activeProject) return;
    setIsSaving(true);
    setErrorBanner(null);
    try {
      const filesToSave = unsavedFiles || activeProject.files;
      const res = await saveStudioProjectChanges(activeProject.id, {
        files: filesToSave,
      });
      setProjects((prev) => prev.map((p) => (p.id === res.project.id ? res.project : p)));
      setUnsavedFiles(null);
      setSuccessBanner(`Saved all changes to "${res.project.name}".`);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Could not save project changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishProject = async (projectToPublish: BuilderProject) => {
    setIsPublishing(true);
    setErrorBanner(null);
    try {
      if (unsavedFiles && activeProject && projectToPublish.id === activeProject.id) {
        await saveStudioProjectChanges(activeProject.id, { files: unsavedFiles });
        setUnsavedFiles(null);
      }
      const res = await publishStudioProject(
        projectToPublish.id,
        customSlugInput.trim() || projectToPublish.publishedSlug || projectToPublish.name
      );
      setProjects((prev) => prev.map((p) => (p.id === res.project.id ? res.project : p)));
      setSuccessBanner(
        `Published "${res.project.name}" live at ${window.location.origin}${res.publishedUrl}`
      );
    } catch (err: any) {
      setErrorBanner(err?.message || 'Failed to publish project.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDuplicate = async (projectId: string) => {
    setErrorBanner(null);
    try {
      const res = await duplicateStudioProject(projectId);
      setProjects((prev) => [res.project, ...prev]);
      setSuccessBanner(`Duplicated project as "${res.project.name}".`);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Failed to duplicate project.');
    }
  };

  const handleDelete = async (projectId: string) => {
    setErrorBanner(null);
    try {
      await deleteStudioProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setConfirmDeleteId(null);
      if (activeProjectId === projectId) {
        const remaining = projects.filter((p) => p.id !== projectId);
        setActiveProjectId(remaining[0]?.id || null);
      }
      setSuccessBanner('Project deleted.');
    } catch (err: any) {
      setErrorBanner(err?.message || 'Failed to delete project.');
    }
  };

  const handleCopyPublishedUrl = (project: BuilderProject) => {
    if (!project.publishedUrl) return;
    const fullUrl = `${window.location.origin}${project.publishedUrl}`;
    navigator.clipboard.writeText(fullUrl).catch(() => {});
    setCopiedSlugId(project.id);
    setTimeout(() => {
      setCopiedSlugId((prev) => (prev === project.id ? null : prev));
    }, 2200);
  };

  const handleDownloadProjectHtml = (project: BuilderProject) => {
    const html = assembleLivePreviewDocument(
      project.id === activeProject?.id ? workingFiles : project.files
    );
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'odry-project'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesType = projectTypeFilter === 'all' || p.projectType === projectTypeFilter;
      const q = projectSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.projectType.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [projects, projectTypeFilter, projectSearch]);

  const publishedProjects = useMemo(
    () => projects.filter((p) => p.status === 'published' && p.publishedUrl),
    [projects]
  );

  const selectedOptionMeta = useMemo(
    () => PROJECT_OPTIONS.find((o) => o.type === selectedType) || PROJECT_OPTIONS[0],
    [selectedType]
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#040711] text-slate-100">
      {/* Global Feedback Notifications */}
      {(errorBanner || successBanner) && (
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 pt-4">
          {errorBanner && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-500/40 bg-rose-950/70 px-4 py-3 text-sm text-rose-200">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{errorBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorBanner(null)}
                className="text-xs font-semibold text-rose-300 hover:text-white cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {successBanner && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-500/40 bg-indigo-950/70 px-4 py-3 text-sm text-indigo-100">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-violet-400 shrink-0" />
                <span>{successBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessBanner(null)}
                className="text-xs font-semibold text-indigo-300 hover:text-white cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          VIEW 0: ODRY STUDIO LANDING PAGE ('home')
         ===================================================================== */}
      {studioView === 'home' && (
        <div className="relative overflow-hidden">
          {/* Atmospheric Deep Navy + Violet/Blue Glow */}
          <div className="pointer-events-none absolute inset-0 odry-radial-glow" />
          <div className="pointer-events-none absolute inset-0 odry-grid-bg opacity-60" />

          {/* Hero Section */}
          <section className="relative mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 pt-14 pb-20 lg:pt-20 lg:pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left 7 Cols: Headline, Subtitle, Primary & Secondary CTAs */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 text-xs font-mono tracking-wider text-violet-300">
                  <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                  <span>ODRY STUDIO · AI SOFTWARE ARCHITECTURE PLATFORM</span>
                </div>

                <h1
                  className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.08] font-display"
                  style={{ textWrap: 'balance' }}
                >
                  Your Ideas. Your Apps. Your Websites. Built with AI.
                </h1>

                <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                  Turn your ideas into professional websites, mobile apps and powerful business systems with Odry Studio.
                </p>

                {/* Primary & Secondary Buttons */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectStudioView('dashboard');
                      setTimeout(() => promptInputRef.current?.focus(), 100);
                    }}
                    className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white px-7 py-4 text-sm sm:text-base font-bold shadow-xl shadow-indigo-950/80 transition active:scale-98 cursor-pointer"
                  >
                    <span>Start Building</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      featuresSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-indigo-500/30 bg-[#0A0F24]/90 hover:bg-[#101736] hover:border-indigo-400/50 text-slate-100 px-6 py-4 text-sm sm:text-base font-semibold transition cursor-pointer"
                  >
                    <span>Explore Features</span>
                  </button>
                </div>

                {/* Unboxed Clean Architectural Capabilities Line */}
                <div className="pt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
                  <span>Full-Stack AI Code Generation</span>
                  <span aria-hidden="true">·</span>
                  <span>Mobile, Tablet &amp; Desktop Live Preview</span>
                  <span aria-hidden="true">·</span>
                  <span>1-Click Cloud Web Publishing</span>
                </div>
              </div>

              {/* Right 5 Cols: Interactive Studio Preview Card */}
              <div className="lg:col-span-5">
                <div className="rounded-3xl border border-indigo-500/25 bg-gradient-to-b from-[#0B1126] to-[#060916] p-6 shadow-2xl shadow-black/80 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300">
                        <Cpu className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white font-display">
                          Odry Studio AI Engine
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Select an architecture to launch builder
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-indigo-300">
                      6 Architectures
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {PROJECT_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.type}
                          type="button"
                          onClick={() => handleSelectProjectTypeCard(opt, true)}
                          className="group rounded-2xl border border-slate-800/90 bg-[#050814]/90 hover:border-violet-500/50 hover:bg-[#0D132B] p-3.5 text-left transition flex items-start gap-3 cursor-pointer"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-950/80 text-violet-400 group-hover:bg-violet-600 group-hover:text-white transition">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">
                              {opt.title}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {opt.categoryLabel}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80">
                    <span>{projects.length} projects in your workspace</span>
                    <button
                      type="button"
                      onClick={() => onSelectStudioView('workspace')}
                      className="font-semibold text-violet-400 hover:text-violet-300 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open AI Workspace</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Explore Features Section */}
          <section
            ref={featuresSectionRef}
            id="explore-features"
            className="relative border-t border-indigo-500/15 bg-[#060918] py-20"
          >
            <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 space-y-12">
              <div className="max-w-2xl space-y-3">
                <p className="text-xs font-mono uppercase tracking-widest text-violet-400">
                  01. Complete Software Builder
                </p>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white font-display">
                  Built for Websites, Mobile Apps &amp; Enterprise Systems
                </h2>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  Choose what you want to build, describe your requirements in plain language, and refine every screen inside the live Odry Studio Workspace.
                </p>
              </div>

              {/* 6 Project Types Showcase */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {PROJECT_OPTIONS.map((option, idx) => {
                  const Icon = option.icon;
                  return (
                    <div
                      key={option.type}
                      className="rounded-3xl border border-slate-800/90 bg-[#0A0F22]/90 hover:border-indigo-500/40 p-6 flex flex-col justify-between gap-5 transition"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/30 text-violet-300">
                            <Icon className="h-5 w-5" />
                          </div>
                          <span className="text-xs font-mono text-slate-500">
                            0{idx + 1} · {option.categoryLabel}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-white font-display">
                            {option.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                            {option.subtitle}
                          </p>
                        </div>

                        <p className="text-xs text-slate-400">
                          {option.defaultFeatures.join(' · ')}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectProjectTypeCard(option, true)}
                        className="w-full rounded-xl border border-indigo-500/30 bg-indigo-950/30 hover:bg-indigo-600 hover:border-indigo-500 text-white py-2.5 px-4 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Start {option.title}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Callout Banner */}
              <div className="rounded-3xl border border-indigo-500/25 bg-gradient-to-r from-[#0B112B] via-indigo-950/60 to-violet-950/50 p-8 sm:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white font-display">
                    Ready to launch your next software project?
                  </h3>
                  <p className="text-sm text-slate-300">
                    Open the Odry Studio Dashboard, describe your idea in ordinary language, and generate working HTML, CSS, and JavaScript in seconds.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectStudioView('dashboard')}
                  className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-7 py-3.5 text-sm font-bold shadow-lg shadow-indigo-950/70 transition shrink-0 cursor-pointer"
                >
                  Open Odry Studio Dashboard
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
          VIEW 1: NEW DASHBOARD ('dashboard')
         ===================================================================== */}
      {studioView === 'dashboard' && (
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 space-y-10">
          {/* Hero & Dashboard Welcome Banner */}
          <section className="relative overflow-hidden rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-[#0A0F24] via-[#070B1A] to-[#121036] p-6 sm:p-10 shadow-2xl shadow-black/70">
            <div className="pointer-events-none absolute inset-0 odry-radial-glow" />
            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="space-y-4 max-w-3xl">
                <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-violet-300">
                  <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                  <span>{language === 'sw' ? 'Karibu kwenye Odry Studio' : 'Welcome to Odry Studio'}</span>
                </div>

                <h1
                  className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.1] font-display"
                  style={{ textWrap: 'balance' }}
                >
                  Your Ideas. Your Apps. Your Websites. Built with AI.
                </h1>

                <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                  Turn your ideas into professional websites, mobile apps and powerful business systems with Odry Studio.
                </p>

                <div className="flex flex-wrap items-center gap-3.5 pt-1">
                  <button
                    type="button"
                    onClick={() => promptInputRef.current?.focus()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white px-6 py-3.5 text-xs sm:text-sm font-bold shadow-xl shadow-indigo-950/80 transition cursor-pointer"
                  >
                    <span>Start Building</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('odry-project-types');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-indigo-500/30 bg-[#050814]/90 hover:bg-[#0D132B] text-slate-100 px-5 py-3.5 text-xs sm:text-sm font-semibold transition cursor-pointer"
                  >
                    <span>Explore Features</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStartFreshNewProject}
                    className="inline-flex items-center gap-1.5 rounded-2xl border border-violet-500/30 bg-violet-950/30 hover:bg-violet-900/40 text-violet-200 px-4 py-3.5 text-xs sm:text-sm font-bold transition cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create New Project</span>
                  </button>
                </div>
              </div>

              {/* Usage Balance & Subscription Information Card */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 min-w-[240px]">
                <div className="rounded-2xl border border-slate-800 bg-[#040711]/90 p-4 flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 shrink-0">
                    <Coins className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Usage Balance</p>
                    <p className="text-base font-mono font-bold text-white tabular-nums">
                      {tokenBalance.toLocaleString()} AI tokens
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onOpenSubscriptionModal}
                  className="rounded-2xl border border-slate-800 bg-[#040711]/90 hover:border-indigo-500/40 p-4 text-left transition cursor-pointer flex items-center gap-3.5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 shrink-0">
                    <Crown className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Subscription Plan</p>
                    <p className="text-xs font-bold text-white">
                      {currentShop.isPro
                        ? `${currentShop.proPlan === 'TRIAL' ? 'PRO Trial' : 'PRO Active'} · ${subscriptionDaysRemaining}d left`
                        : showSubscriptionPlan
                        ? 'Renew PRO · KES 299'
                        : 'Odry Studio Plan'}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </section>

          {/* Prominent AI Prompt Box: "What do you want to build today?" */}
          <section className="rounded-3xl border border-violet-500/30 bg-gradient-to-b from-[#0B1126] to-[#070B19] p-6 sm:p-8 shadow-2xl shadow-black/70 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label
                  htmlFor="odry-main-prompt"
                  className="text-xl sm:text-2xl font-extrabold text-white font-display block"
                >
                  {language === 'sw'
                    ? 'Unataka kujenga nini leo?'
                    : 'What do you want to build today?'}
                </label>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Describe your website, mobile app, web application, booking system, or business software in ordinary language.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-indigo-300">
                <span>Selected: {selectedOptionMeta.title}</span>
              </div>
            </div>

            {/* Project Name & Type Row */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-7">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder={`e.g. ${selectedOptionMeta.title.replace('Build a ', 'Odry ')}`}
                  className="w-full rounded-xl border border-slate-800 bg-[#040711] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Project Architecture
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => {
                    const nextType = e.target.value as BuilderProjectType;
                    const found = PROJECT_OPTIONS.find((o) => o.type === nextType);
                    if (found) handleSelectProjectTypeCard(found, false);
                  }}
                  className="w-full rounded-xl border border-slate-800 bg-[#040711] px-4 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none"
                >
                  {PROJECT_OPTIONS.map((o) => (
                    <option key={o.type} value={o.type}>
                      {o.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Main Natural Language Prompt Textarea */}
            <div className="space-y-3">
              <textarea
                id="odry-main-prompt"
                ref={promptInputRef}
                rows={4}
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Explain what you want to build in ordinary language — include pages, workflows, calculators, booking forms, or dashboards..."
                className="w-full rounded-2xl border border-indigo-500/30 bg-[#040711] p-4 text-sm sm:text-base text-white placeholder-slate-500 focus:border-violet-400 focus:outline-none leading-relaxed"
              />

              {/* Sample Starter Prompts for Selected Architecture */}
              <div className="space-y-2">
                <span className="block text-xs text-slate-400">
                  Starter ideas for <strong className="text-slate-200">{selectedOptionMeta.title}</strong> (click to populate):
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {selectedOptionMeta.samplePrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setProjectDescription(prompt)}
                      className="text-left text-xs text-slate-300 hover:text-white bg-[#040711]/90 hover:bg-indigo-950/40 border border-slate-800/90 hover:border-indigo-500/40 rounded-xl p-3 transition line-clamp-2 cursor-pointer"
                    >
                      “{prompt}”
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Toggleable Design Preferences & Required Features */}
            <div className="border-t border-slate-800/80 pt-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setShowAdvancedConfig((prev) => !prev)}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-violet-300 hover:text-white transition cursor-pointer"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>
                    {showAdvancedConfig
                      ? 'Hide Design Preferences & Required Features'
                      : `Configure Design Preferences & Features (${requiredFeatures.length} modules selected)`}
                  </span>
                </button>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-mono text-slate-400">
                    10 tokens / generation
                  </span>
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => handleGenerateProject(false)}
                    className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-60 text-white py-3.5 px-7 text-sm font-bold shadow-xl shadow-indigo-950/80 transition cursor-pointer"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Generating with Odry AI...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4" />
                        <span>Generate Project with AI</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {isGenerating && generationStatus && (
                <p className="text-xs font-mono text-violet-300 animate-pulse">
                  {generationStatus}
                </p>
              )}

              {showAdvancedConfig && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-slate-800/70">
                  {/* Required Features (7 cols) */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">
                        Required Features &amp; Modules
                      </span>
                      <span className="text-xs font-mono text-violet-400">
                        {requiredFeatures.length} selected
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {AVAILABLE_FEATURES.map((feat) => {
                        const active = requiredFeatures.includes(feat);
                        return (
                          <button
                            key={feat}
                            type="button"
                            onClick={() => toggleFeature(feat)}
                            className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-medium text-left transition cursor-pointer ${
                              active
                                ? 'border-violet-500/80 bg-indigo-950/50 text-white'
                                : 'border-slate-800 bg-[#040711] text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <span className="truncate">{feat}</span>
                            <span
                              className={`flex h-4 w-4 items-center justify-center rounded ${
                                active ? 'bg-violet-600 text-white' : 'border border-slate-700'
                              }`}
                            >
                              {active && <Check className="h-3 w-3" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <form onSubmit={handleAddCustomFeature} className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={customFeatureInput}
                        onChange={(e) => setCustomFeatureInput(e.target.value)}
                        placeholder="Add custom feature (e.g. Multi-Branch Inventory, Mortgage Table)..."
                        className="flex-1 rounded-xl border border-slate-800 bg-[#040711] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 transition cursor-pointer shrink-0"
                      >
                        + Add Feature
                      </button>
                    </form>
                  </div>

                  {/* Design Preferences (5 cols) */}
                  <div className="lg:col-span-5 space-y-4">
                    <span className="text-xs font-bold text-slate-200 block">
                      Design Preferences
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      {COLOR_PALETTES.map((p) => {
                        const active = designPreferences.colorPalette === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() =>
                              setDesignPreferences((prev) => ({ ...prev, colorPalette: p.id }))
                            }
                            className={`flex items-center justify-between rounded-xl border p-2.5 text-xs font-medium transition cursor-pointer ${
                              active
                                ? 'border-violet-500 bg-indigo-950/40 text-white'
                                : 'border-slate-800 bg-[#040711] text-slate-400 hover:text-white'
                            }`}
                          >
                            <span className="truncate">{p.name}</span>
                            <span className="flex items-center gap-1 shrink-0">
                              {p.swatches.map((hex, i) => (
                                <span
                                  key={i}
                                  className="h-3 w-3 rounded-full border border-white/20"
                                  style={{ backgroundColor: hex }}
                                />
                              ))}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Theme Mode
                        </label>
                        <select
                          value={designPreferences.themeMode}
                          onChange={(e) =>
                            setDesignPreferences((prev) => ({
                              ...prev,
                              themeMode: e.target.value as DesignPreferences['themeMode'],
                            }))
                          }
                          className="w-full rounded-xl border border-slate-800 bg-[#040711] px-3 py-2 text-xs text-white focus:border-violet-500 focus:outline-none"
                        >
                          <option value="dark">Deep Dark Mode</option>
                          <option value="light">Clean Daylight Mode</option>
                          <option value="adaptive">Adaptive Theme</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Typography
                        </label>
                        <select
                          value={designPreferences.typography}
                          onChange={(e) =>
                            setDesignPreferences((prev) => ({
                              ...prev,
                              typography: e.target.value as DesignPreferences['typography'],
                            }))
                          }
                          className="w-full rounded-xl border border-slate-800 bg-[#040711] px-3 py-2 text-xs text-white focus:border-violet-500 focus:outline-none"
                        >
                          <option value="modern_sans">Modern Geometric Sans</option>
                          <option value="editorial_serif">Editorial Serif</option>
                          <option value="technical_mono">Technical Mono</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* The 6 Core Project Options */}
          <section id="odry-project-types" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                  Choose a Project Type
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  Select what you want to build to load tailored modules and starter prompts.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PROJECT_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedType === option.type;
                return (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => handleSelectProjectTypeCard(option, true)}
                    className={`group text-left rounded-3xl p-6 border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-violet-500 bg-gradient-to-b from-indigo-950/60 to-[#090D1E] shadow-xl shadow-indigo-950/50'
                        : 'border-slate-800/90 bg-[#080C1C] hover:border-indigo-500/40 hover:bg-[#0B1024]'
                    }`}
                  >
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-2xl transition ${
                            isSelected
                              ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white'
                              : 'bg-slate-900 border border-slate-800 text-violet-400 group-hover:border-violet-500/40'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-mono text-slate-400">
                          {option.categoryLabel}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-white font-display flex items-center justify-between">
                          <span>{language === 'sw' ? option.titleSw : option.title}</span>
                          {isSelected && <Check className="h-4 w-4 text-violet-400 shrink-0" />}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                          {language === 'sw' ? option.subtitleSw : option.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-mono">
                        {option.defaultFeatures.length} core modules
                      </span>
                      <span
                        className={`font-semibold inline-flex items-center gap-1 ${
                          isSelected ? 'text-violet-300' : 'text-slate-400 group-hover:text-white'
                        }`}
                      >
                        <span>{isSelected ? 'Selected' : 'Select'}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Recent Projects Section */}
          <section className="space-y-4 pt-4 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white font-display">
                  Recent Projects
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  Reopen any project in the AI Workspace to chat with AI, edit code, preview across devices, or publish live.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleStartFreshNewProject}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-950/30 hover:bg-indigo-900/50 px-3.5 py-2 text-xs font-bold text-indigo-200 transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create New Project</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectStudioView('projects')}
                  className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>View All ({projects.length})</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {isLoadingProjects ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-40 rounded-3xl border border-slate-800 bg-[#080C1C] animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {projects.slice(0, 6).map((proj) => (
                  <div
                    key={proj.id}
                    className="rounded-3xl border border-slate-800/90 bg-[#080C1C] hover:border-indigo-500/40 p-5 flex flex-col justify-between gap-4 transition"
                  >
                    <div className="space-y-2">
                      {/* Clean unboxed metadata with typographic separators */}
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                        <span className="text-violet-400 uppercase">
                          {proj.projectType.replace(/_/g, ' ')}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{proj.files.length} files</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            proj.status === 'published' ? 'text-emerald-400' : 'text-slate-400'
                          }
                        >
                          {proj.status === 'published' ? 'Published' : 'Draft'}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white font-display truncate">
                        {proj.name}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {proj.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveProjectId(proj.id);
                          onSelectStudioView('workspace');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-3.5 py-2 text-xs font-bold transition cursor-pointer"
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                        <span>Open Workspace</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {proj.publishedUrl && (
                          <a
                            href={proj.publishedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 px-2 py-1"
                          >
                            <span>Live</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDuplicate(proj.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
                          title="Duplicate Project"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* =====================================================================
          VIEW 2: NEW AI BUILDER WORKSPACE ('workspace')
          Project Sidebar + AI Chat Panel + Central Live Preview + Project Files + Responsive Controls
         ===================================================================== */}
      {studioView === 'workspace' && (
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-5 space-y-4">
          {!activeProject ? (
            <div className="rounded-3xl border border-slate-800 bg-[#080C1C] p-12 text-center space-y-4">
              <Layers className="h-10 w-10 text-violet-400 mx-auto" />
              <h2 className="text-xl font-bold text-white font-display">
                No Active Project Selected
              </h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Start by creating a new Website, Mobile App, Web Application, Booking System, or Business Management System from the Odry Studio Dashboard.
              </p>
              <button
                type="button"
                onClick={() => onSelectStudioView('dashboard')}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-5 py-2.5 text-xs font-bold cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Create Project in Dashboard</span>
              </button>
            </div>
          ) : (
            <>
              {/* Workspace Top Control Bar */}
              <div className="rounded-2xl border border-indigo-500/20 bg-[#080C1C] p-3.5 flex flex-wrap items-center justify-between gap-3">
                {/* Active Project Title & Status */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white font-display">
                      {activeProject.name}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-xs font-mono text-violet-400 uppercase">
                      {activeProject.projectType.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {unsavedFiles && (
                    <span className="text-[11px] font-mono text-amber-400">
                      · Unsaved file edits
                    </span>
                  )}
                </div>

                {/* Central View Mode Switcher: Live Preview / Split / Code / Settings */}
                <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-[#040711] p-1">
                  <button
                    type="button"
                    onClick={() => setWorkspaceMode('preview')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      workspaceMode === 'preview'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Live Preview</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkspaceMode('split')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      workspaceMode === 'split'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Columns className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Split View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkspaceMode('code')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      workspaceMode === 'code'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    <span>Code Editor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkspaceMode('design')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      workspaceMode === 'design'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">Specs</span>
                  </button>
                </div>

                {/* Responsive Preview Device Controls: Mobile / Tablet / Desktop */}
                <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-[#040711] p-1">
                  <button
                    type="button"
                    onClick={() => setViewport('mobile')}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      viewport === 'mobile'
                        ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Mobile Preview (375px)"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    <span className="hidden xl:inline">Mobile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewport('tablet')}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      viewport === 'tablet'
                        ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Tablet Preview (768px)"
                  >
                    <Tablet className="h-3.5 w-3.5" />
                    <span className="hidden xl:inline">Tablet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewport('desktop')}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      viewport === 'desktop'
                        ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Desktop Preview (100%)"
                  >
                    <Monitor className="h-3.5 w-3.5" />
                    <span className="hidden xl:inline">Desktop</span>
                  </button>
                </div>

                {/* Save, Export & Publish Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveWorkspace}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3 py-2 text-xs font-bold text-white transition cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5 text-violet-400" />
                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadProjectHtml(activeProject)}
                    className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 transition cursor-pointer"
                    title="Download standalone HTML bundle"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPublishing}
                    onClick={() => handlePublishProject(activeProject)}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-4 py-2 text-xs font-bold shadow-md shadow-indigo-950/60 transition cursor-pointer"
                  >
                    <Rocket className="h-3.5 w-3.5" />
                    <span>
                      {isPublishing
                        ? 'Publishing...'
                        : activeProject.status === 'published'
                        ? 'Update Live'
                        : 'Publish'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Published Live Banner if project is live */}
              {activeProject.status === 'published' && activeProject.publishedUrl && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold">Published Live URL:</span>
                    <a
                      href={activeProject.publishedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono underline hover:text-white"
                    >
                      {window.location.origin}
                      {activeProject.publishedUrl}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyPublishedUrl(activeProject)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 px-2.5 py-1 text-emerald-200 font-semibold cursor-pointer"
                    >
                      {copiedSlugId === activeProject.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-300" />
                          <span>Copied URL</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                    <a
                      href={activeProject.publishedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-white font-semibold"
                    >
                      <span>Open Live Tab</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {/* 3-Column Modern AI Workspace Grid:
                  Col 1 (2 cols): Project Sidebar & Project Files
                  Col 2 (3 cols): AI Chat Panel
                  Col 3 (7 cols): Central Live Preview / Code Editor / Split View */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[700px]">
                {/* COLUMN 1: PROJECT SIDEBAR & PROJECT FILES */}
                <aside className="lg:col-span-2 rounded-2xl border border-slate-800/90 bg-[#080C1C] p-3.5 flex flex-col justify-between gap-4">
                  <div className="space-y-4">
                    {/* Project Switcher */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                          Projects ({projects.length})
                        </span>
                        <button
                          type="button"
                          onClick={handleStartFreshNewProject}
                          className="text-[11px] font-semibold text-violet-400 hover:text-white cursor-pointer"
                        >
                          + New
                        </button>
                      </div>
                      <select
                        value={activeProject.id}
                        onChange={(e) => setActiveProjectId(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-[#040711] px-2.5 py-2 text-xs font-semibold text-white focus:border-violet-500 focus:outline-none"
                      >
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Project Files Explorer */}
                    <div className="space-y-2 border-t border-slate-800/80 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                          Project Files
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsAddingFile((prev) => !prev)}
                          className="text-[11px] font-mono text-violet-400 hover:text-white cursor-pointer"
                        >
                          + File
                        </button>
                      </div>

                      {isAddingFile && (
                        <form onSubmit={handleCreateNewFile} className="space-y-1.5">
                          <input
                            type="text"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            placeholder="e.g. utils.js"
                            className="w-full rounded-lg border border-slate-700 bg-[#040711] px-2.5 py-1.5 text-xs font-mono text-white"
                          />
                          <button
                            type="submit"
                            className="w-full rounded-lg bg-indigo-600 py-1 text-xs font-semibold text-white cursor-pointer"
                          >
                            Create File
                          </button>
                        </form>
                      )}

                      <div className="space-y-1">
                        {workingFiles.map((file) => {
                          const isSelected = activeFile.path === file.path;
                          return (
                            <button
                              key={file.path}
                              type="button"
                              onClick={() => {
                                setSelectedFilePath(file.path);
                                if (workspaceMode === 'preview') {
                                  setWorkspaceMode('split');
                                }
                              }}
                              className={`w-full flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs font-mono transition cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-600/25 text-white border border-indigo-500/40 font-semibold'
                                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                              }`}
                            >
                              <span className="flex items-center gap-1.5 truncate">
                                <FileCode className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                                <span className="truncate">{file.path}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Architecture Info Footer inside Sidebar */}
                  <div className="rounded-xl border border-slate-800/80 bg-[#040711] p-3 space-y-1.5 text-[11px] text-slate-400">
                    <div className="font-semibold text-slate-200">Backend Status</div>
                    <p className="leading-relaxed">
                      AI Generation &amp; Live Hosting connected via Express server.
                    </p>
                  </div>
                </aside>

                {/* COLUMN 2: AI CHAT PANEL */}
                <section className="lg:col-span-3 rounded-2xl border border-slate-800/90 bg-[#080C1C] flex flex-col overflow-hidden">
                  <div className="border-b border-slate-800 bg-[#050814] px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-violet-400" />
                      <span className="text-xs font-bold text-white font-display">
                        Odry AI Chat Panel
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      Live Co-Architect
                    </span>
                  </div>

                  {/* Chat Messages Feed */}
                  <div className="flex-1 p-3.5 space-y-3 overflow-y-auto max-h-[440px]">
                    {activeChatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`rounded-2xl p-3 text-xs leading-relaxed space-y-1.5 ${
                          msg.role === 'user'
                            ? 'bg-indigo-600/25 border border-indigo-500/30 text-white ml-4'
                            : 'bg-[#040711] border border-slate-800/90 text-slate-200 mr-2'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>{msg.role === 'user' ? 'You' : 'Odry Studio AI'}</span>
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p>{msg.content}</p>
                        {msg.filesUpdated && msg.filesUpdated.length > 0 && (
                          <div className="pt-1 text-[10px] font-mono text-violet-300">
                            Updated: {msg.filesUpdated.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}

                    {isGenerating && (
                      <div className="rounded-2xl border border-violet-500/30 bg-violet-950/20 p-3 text-xs text-violet-200 flex items-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-violet-400 shrink-0" />
                        <span>{generationStatus || 'Updating project files...'}</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Refinement Suggestions */}
                  <div className="px-3.5 py-2 border-t border-slate-800/80 bg-[#050814]/60 space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      Quick AI Prompts:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Add interactive pricing & payment modal',
                        'Add KPI analytics summary cards',
                        'Enhance hero & mobile navigation',
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          disabled={isGenerating}
                          onClick={() => handleGenerateProject(true, suggestion)}
                          className="rounded-lg border border-slate-800 bg-[#080C1C] hover:border-violet-500/40 px-2 py-1 text-[11px] text-slate-300 hover:text-white transition cursor-pointer text-left"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chat Input Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleGenerateProject(true);
                    }}
                    className="p-3 border-t border-slate-800 bg-[#040711] flex flex-col gap-2"
                  >
                    <textarea
                      rows={2}
                      value={refinementPrompt}
                      onChange={(e) => setRefinementPrompt(e.target.value)}
                      placeholder="Ask AI to add a section, form, calculator, or refine styling..."
                      className="w-full rounded-xl border border-slate-800 bg-[#080C1C] p-2.5 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none resize-none"
                    />
                    <button
                      type="submit"
                      disabled={isGenerating || !refinementPrompt.trim()}
                      className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 py-2 px-3 text-xs font-bold text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{isGenerating ? 'Applying AI Changes...' : 'Send to AI Builder'}</span>
                    </button>
                  </form>
                </section>

                {/* COLUMN 3: CENTRAL LIVE PREVIEW & CODE EDITOR (7 cols) */}
                <section className="lg:col-span-7 flex flex-col gap-4">
                  {workspaceMode === 'design' ? (
                    <div className="rounded-2xl border border-slate-800 bg-[#080C1C] p-6 grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                      <div className="space-y-4">
                        <h3 className="text-base font-bold text-white font-display">
                          Project Specification &amp; Publishing
                        </h3>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Project Name</label>
                          <input
                            type="text"
                            value={activeProject.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setProjects((prev) =>
                                prev.map((p) =>
                                  p.id === activeProject.id ? { ...p, name: val } : p
                                )
                              );
                            }}
                            className="w-full rounded-xl border border-slate-700 bg-[#040711] px-3.5 py-2 text-sm text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">
                            Project Description
                          </label>
                          <textarea
                            rows={4}
                            value={activeProject.description}
                            onChange={(e) => {
                              const val = e.target.value;
                              setProjects((prev) =>
                                prev.map((p) =>
                                  p.id === activeProject.id ? { ...p, description: val } : p
                                )
                              );
                            }}
                            className="w-full rounded-xl border border-slate-700 bg-[#040711] p-3 text-sm text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">
                            Custom Deployment URL Slug
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-500">/published/</span>
                            <input
                              type="text"
                              value={customSlugInput}
                              onChange={(e) => setCustomSlugInput(e.target.value)}
                              placeholder="my-custom-app"
                              className="flex-1 rounded-xl border border-slate-700 bg-[#040711] px-3 py-2 text-xs font-mono text-white"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await saveStudioProjectChanges(activeProject.id, {
                              name: activeProject.name,
                              description: activeProject.description,
                            });
                            setSuccessBanner('Saved project specifications.');
                          }}
                          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white cursor-pointer"
                        >
                          Save Specification
                        </button>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-base font-bold text-white font-display">
                          Architecture &amp; Configured Modules
                        </h3>
                        <div className="rounded-xl border border-slate-800 bg-[#040711] p-4 space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Architecture:</span>
                            <span className="font-mono text-violet-400 uppercase">
                              {activeProject.projectType.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Color Palette:</span>
                            <span className="font-mono text-white">
                              {activeProject.designPreferences.colorPalette}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Theme Polarity:</span>
                            <span className="font-mono text-white">
                              {activeProject.designPreferences.themeMode}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Typography:</span>
                            <span className="font-mono text-white">
                              {activeProject.designPreferences.typography}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <span className="text-xs text-slate-400 block">Included Modules:</span>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {activeProject.requiredFeatures.join(' · ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 flex-1">
                      {/* Code Editor Pane (Shown in 'code' or 'split' mode) */}
                      {(workspaceMode === 'code' || workspaceMode === 'split') && (
                        <div className="rounded-2xl border border-slate-800 bg-[#080C1C] flex flex-col overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2 bg-[#040711] border-b border-slate-800 text-xs font-mono text-slate-400">
                            <span className="flex items-center gap-2 text-white">
                              <Terminal className="h-3.5 w-3.5 text-violet-400" />
                              <span>{activeFile.path}</span>
                            </span>
                            <span>{activeFile.content.split('\n').length} lines</span>
                          </div>
                          <textarea
                            value={activeFile.content}
                            onChange={(e) => handleUpdateFileContent(e.target.value)}
                            spellCheck={false}
                            className={`w-full bg-[#040711] text-slate-100 font-mono text-xs leading-relaxed p-4 focus:outline-none resize-none ${
                              workspaceMode === 'split' ? 'h-[260px]' : 'min-h-[580px] flex-1'
                            }`}
                          />
                        </div>
                      )}

                      {/* Central Live Preview Pane (Shown in 'preview' or 'split' mode) */}
                      {(workspaceMode === 'preview' || workspaceMode === 'split') && (
                        <div className="rounded-2xl border border-slate-800 bg-[#080C1C] flex flex-col overflow-hidden flex-1">
                          {/* Browser Preview Address Bar */}
                          <div className="border-b border-slate-800 bg-[#040711] px-3.5 py-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
                              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
                              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                            </div>

                            <div className="flex-1 max-w-md rounded-lg border border-slate-800 bg-[#080C1C] px-3 py-1 text-[11px] font-mono text-slate-400 truncate text-center">
                              {activeProject.publishedUrl
                                ? `${window.location.origin}${activeProject.publishedUrl}`
                                : `preview://odry-studio/${activeProject.id}/${viewport}`}
                            </div>

                            <button
                              type="button"
                              onClick={() => setPreviewKey((k) => k + 1)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
                              title="Reload Live Preview"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Responsive Viewport Frame */}
                          <div className="flex-1 bg-[#040711]/90 p-3 sm:p-5 flex items-start justify-center overflow-auto">
                            <div
                              className={`bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-800 transition-all duration-300 ${
                                viewport === 'mobile'
                                  ? 'w-[375px] h-[640px]'
                                  : viewport === 'tablet'
                                  ? 'w-[768px] h-[640px]'
                                  : 'w-full h-[620px]'
                              }`}
                            >
                              <iframe
                                key={previewKey}
                                title={`Live Preview - ${activeProject.name}`}
                                srcDoc={previewHtmlDoc}
                                sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
                                className="w-full h-full border-0"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </div>
      )}

      {/* =====================================================================
          VIEW 3: PROJECT MANAGEMENT ('projects')
         ===================================================================== */}
      {studioView === 'projects' && (
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-violet-400">
                Project Management
              </span>
              <h1 className="text-2xl font-extrabold text-white font-display mt-0.5">
                All Odry Studio Projects ({projects.length})
              </h1>
            </div>

            <button
              type="button"
              onClick={handleStartFreshNewProject}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-5 py-2.5 text-xs font-bold cursor-pointer self-start"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Project</span>
            </button>
          </div>

          {/* Search & Architecture Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                placeholder="Search projects by name, description, or architecture..."
                className="w-full rounded-xl border border-slate-800 bg-[#080C1C] pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
              />
            </div>

            <select
              value={projectTypeFilter}
              onChange={(e) => setProjectTypeFilter(e.target.value as BuilderProjectType | 'all')}
              className="rounded-xl border border-slate-800 bg-[#080C1C] px-3.5 py-2.5 text-xs text-white focus:border-violet-500 focus:outline-none"
            >
              <option value="all">All Project Architectures</option>
              {PROJECT_OPTIONS.map((o) => (
                <option key={o.type} value={o.type}>
                  {o.title}
                </option>
              ))}
            </select>
          </div>

          {/* Project List Grid */}
          {filteredProjects.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-[#080C1C] p-12 text-center space-y-3">
              <p className="text-sm text-slate-400">No matching projects found.</p>
              <button
                type="button"
                onClick={handleStartFreshNewProject}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white cursor-pointer"
              >
                Create New Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-3xl border border-slate-800 bg-[#080C1C] p-6 flex flex-col justify-between gap-4 hover:border-indigo-500/40 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                      <span className="text-violet-400 uppercase">
                        {project.projectType.replace(/_/g, ' ')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          project.status === 'published' ? 'text-emerald-400' : 'text-slate-400'
                        }
                      >
                        {project.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-white font-display">{project.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                        {project.description}
                      </p>
                    </div>

                    <p className="text-xs text-slate-400 pt-1">
                      {project.requiredFeatures.slice(0, 3).join(' · ')}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <div className="text-[11px] font-mono text-slate-500 flex justify-between">
                      <span>{project.files.length} files</span>
                      <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveProjectId(project.id);
                          onSelectStudioView('workspace');
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-3 py-2 text-xs font-bold transition cursor-pointer"
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                        <span>Open &amp; Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicate(project.id)}
                        className="rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 p-2 text-slate-200 transition cursor-pointer"
                        title="Duplicate Project"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>

                      {confirmDeleteId === project.id ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(project.id)}
                          className="rounded-xl bg-rose-600 hover:bg-rose-500 px-2.5 py-2 text-xs font-bold text-white transition cursor-pointer"
                        >
                          Confirm
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(project.id)}
                          className="rounded-xl border border-slate-800 bg-[#040711] hover:border-rose-500/50 hover:text-rose-400 p-2 text-slate-400 transition cursor-pointer"
                          title="Delete Project"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          VIEW 4: PUBLISHED DEPLOYMENTS ('published')
         ===================================================================== */}
      {studioView === 'published' && (
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-violet-400">
                Live Hosting &amp; Deployments
              </span>
              <h1 className="text-2xl font-extrabold text-white font-display mt-0.5">
                Published Websites &amp; Applications ({publishedProjects.length})
              </h1>
            </div>
          </div>

          {publishedProjects.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-[#080C1C] p-12 text-center space-y-4">
              <Rocket className="h-10 w-10 text-violet-400 mx-auto" />
              <h2 className="text-lg font-bold text-white font-display">
                No Published Deployments Yet
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Open any of your projects in the Odry Studio Workspace and click <strong>Publish</strong> to deploy a live, shareable web application URL.
              </p>
              <button
                type="button"
                onClick={() => onSelectStudioView('projects')}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white cursor-pointer"
              >
                Select a Project to Publish
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {publishedProjects.map((proj) => (
                <div
                  key={proj.id}
                  className="rounded-3xl border border-indigo-500/30 bg-[#080C1C] p-6 space-y-4"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-emerald-400">Live Web Deployment</span>
                    <span className="text-violet-400 uppercase">
                      {proj.projectType.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white font-display">{proj.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{proj.description}</p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-[#040711] p-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-indigo-300 truncate">
                      {window.location.origin}
                      {proj.publishedUrl}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyPublishedUrl(proj)}
                        className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-xs font-semibold text-white cursor-pointer flex items-center gap-1"
                      >
                        {copiedSlugId === proj.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                      <a
                        href={proj.publishedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1 text-xs font-bold text-white flex items-center gap-1"
                      >
                        <span>Visit</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveProjectId(proj.id);
                        onSelectStudioView('workspace');
                      }}
                      className="text-xs font-semibold text-violet-400 hover:text-violet-300 cursor-pointer"
                    >
                      Edit Source in Workspace →
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadProjectHtml(proj)}
                      className="text-xs font-semibold text-slate-400 hover:text-white cursor-pointer flex items-center gap-1"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download Bundle</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
