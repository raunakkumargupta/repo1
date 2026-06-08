"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Loader2, User, Globe, CheckCircle2, Shield, FileText, 
  Phone, AlertTriangle, Book, Coffee, Check, Eye, 
  FileDown, MapPin, GraduationCap, Calendar, Utensils, 
  ChevronRight, Sparkles, X, ExternalLink 
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { fetchApi } from "@/lib/api";

const Github = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const Linkedin = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" rx="1" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const getEmbeddableResumeUrl = (url: string) => {
  if (!url) return "";
  if (url.includes("drive.google.com")) {
    return url.replace(/\/view(\?.*)?$/, "/preview").replace(/\/edit(\?.*)?$/, "/preview");
  }
  return url;
};

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);

  // Account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Profile Fields
  const [gender, setGender] = useState("");
  const [tshirtSize, setTshirtSize] = useState("");
  const [city, setCity] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyNumber, setEmergencyNumber] = useState("");
  const [bio, setBio] = useState("");
  const [readmeMd, setReadmeMd] = useState("");
  const [hasFormalEducation, setHasFormalEducation] = useState(true);
  const [degreeType, setDegreeType] = useState("");
  const [institution, setInstitution] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [gradMonth, setGradMonth] = useState("");
  const [dietaryPreference, setDietaryPreference] = useState("");
  const [allergies, setAllergies] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [resume, setResume] = useState("");
  const [skills, setSkills] = useState("");
  const [teamPreference, setTeamPreference] = useState("Solo");

  useEffect(() => {
    // Fetch Basic User Info
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => {
        if (user) {
          setName(user.name || "Hacker");
          setEmail(user.email || "");
        }
      })
      .catch(console.error);

    // Fetch Global Hacker Profile
    fetchApi<any>("/profile/me")
      .then((data) => {
        if (data && data.user_id) {
          setGender(data.gender || "");
          setTshirtSize(data.tshirt_size || "");
          setCity(data.city || "");
          setPhoneNumber(data.phone_number || "");
          setEmergencyName(data.emergency_contact_name || "");
          setEmergencyNumber(data.emergency_contact_number || "");
          setBio(data.bio || "");
          setReadmeMd(data.readme_md || "");
          setHasFormalEducation(data.has_formal_education);
          setDegreeType(data.degree_type || "");
          setInstitution(data.institution || "");
          setFieldOfStudy(data.field_of_study || "");
          setGradYear(data.grad_year ? data.grad_year.toString() : "");
          setGradMonth(data.grad_month || "");
          setDietaryPreference(data.dietary_preference || "");
          setAllergies(data.allergies || "");
          setGithub(data.github_url || "");
          setLinkedin(data.linkedin_url || "");
          setResume(data.resume_url || "");
          setSkills(data.skills || "");
          setTeamPreference(data.default_team_preference || "Solo");
        }
      })
      .catch((err) => console.log("No profile set yet.", err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      await fetchApi("/profile/me", {
        method: "POST",
        body: JSON.stringify({
          gender,
          tshirt_size: tshirtSize,
          city,
          phone_number: phoneNumber,
          emergency_contact_name: emergencyName,
          emergency_contact_number: emergencyNumber,
          bio,
          readme_md: readmeMd,
          has_formal_education: hasFormalEducation,
          degree_type: degreeType,
          institution,
          field_of_study: fieldOfStudy,
          grad_year: gradYear ? parseInt(gradYear, 10) : 0,
          grad_month: gradMonth,
          dietary_preference: dietaryPreference,
          allergies,
          github_url: github,
          linkedin_url: linkedin,
          resume_url: resume,
          skills,
          default_team_preference: teamPreference,
        }),
      });

      setMessage("Global profile saved successfully! You are ready to apply to hackathons.");
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (previewMode) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        {/* Toggle / Mode Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200/60 dark:border-white/10 pb-6 gap-4">
          <div className="text-left">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Global Hacker Profile</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your identity, portfolio, and hackathon preferences once.</p>
          </div>
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-inner self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setPreviewMode(false)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                !previewMode 
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-md font-bold" 
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Edit Mode
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode(true)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                previewMode 
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-md font-bold" 
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Preview Mode
            </button>
          </div>
        </div>

        {/* Informative top bar */}
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center gap-2 shadow-sm">
          <Eye className="w-4 h-4" />
          You are viewing a preview of your public profile. Teammates and organizers will see it this way.
        </div>

        {/* Public Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Column: Avatar, Badges, Skills, Quick Details */}
          <div className="md:col-span-1 space-y-6">
            
            {/* Avatar & Key Links Card */}
            <div className="glass border border-slate-200/60 dark:border-white/10 rounded-3xl p-6 text-center space-y-5">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-blue-500/20 animate-pulse">
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{name}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{email}</p>
              </div>

              {bio && (
                <p className="text-sm text-slate-600 dark:text-slate-300 italic leading-relaxed px-2 border-t border-slate-100 dark:border-white/5 pt-4">
                  "{bio}"
                </p>
              )}

              {/* Social / Portfolio Links */}
              <div className="flex flex-col gap-2 pt-2">
                {github && (
                  <a href={github} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors border border-slate-100 dark:border-white/5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-2"><Github className="w-4 h-4" /> GitHub</span>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </a>
                )}
                {linkedin && (
                  <a href={linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors border border-slate-100 dark:border-white/5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-2"><Linkedin className="w-4 h-4" /> LinkedIn</span>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </a>
                )}
                {resume && (
                  <button 
                    type="button"
                    onClick={() => setShowResumeModal(true)} 
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-blue-500/5 hover:bg-blue-500/10 transition-colors border border-blue-500/10 text-sm font-semibold text-blue-600 dark:text-blue-400 cursor-pointer"
                  >
                    <span className="flex items-center gap-2"><FileDown className="w-4 h-4" /> View Resume</span>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Details Card */}
            <div className="glass border border-slate-200/60 dark:border-white/10 rounded-3xl p-6 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Hacker Details</h3>
              <div className="space-y-3 text-sm">
                {city && (
                  <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span>Based in <strong className="font-semibold text-slate-900 dark:text-white">{city}</strong></span>
                  </div>
                )}
                {gender && (
                  <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                    <User className="w-4 h-4 text-purple-500" />
                    <span>Gender: <strong className="font-semibold text-slate-900 dark:text-white">{gender}</strong></span>
                  </div>
                )}
                {tshirtSize && (
                  <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Swag Size: <strong className="font-semibold text-slate-900 dark:text-white">{tshirtSize}</strong></span>
                  </div>
                )}
                {dietaryPreference && (
                  <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                    <Utensils className="w-4 h-4 text-emerald-500" />
                    <span>Diet: <strong className="font-semibold text-slate-900 dark:text-white">{dietaryPreference}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Tech Stack / Skills Card */}
            {skills && (
              <div className="glass border border-slate-200/60 dark:border-slate-800/45 rounded-3xl p-6 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Tech Stack</h3>
                <div className="flex flex-wrap gap-2">
                  {skills.split(",").map(skill => skill.trim()).filter(Boolean).map(skill => (
                    <span key={skill} className="px-3 py-1 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-white/5 rounded-lg text-xs font-semibold">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Markdown README, Education */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Education Summary Card */}
            {hasFormalEducation && institution && (
              <div className="glass border border-slate-200/60 dark:border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Education History</h3>
                </div>
                <div className="pl-11 space-y-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{institution}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    {degreeType} in {fieldOfStudy}
                  </p>
                  {(gradMonth || gradYear) && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1 font-semibold">
                      <Calendar className="w-3.5 h-3.5" />
                      Expected Graduation: {gradMonth} {gradYear}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Readme Card */}
            <div className="glass border border-slate-200/60 dark:border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">README.md</h3>
                </div>
              </div>

              <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                {readmeMd ? (
                  <ReactMarkdown>{readmeMd}</ReactMarkdown>
                ) : (
                  <p className="text-slate-400 italic">No README content added. Edit your profile to tell your story!</p>
                )}
              </div>
            </div>
          </div>
          
        </div>

        {/* Modal resume overlay */}
        {showResumeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-lg animate-in fade-in duration-200">
            <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Resume Document Preview</h3>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowResumeModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Iframe Content */}
              <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-2 sm:p-4">
                <iframe
                  src={getEmbeddableResumeUrl(resume)}
                  className="w-full h-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white"
                  title="Resume Preview"
                  allow="autoplay"
                />
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center px-6 py-4 border-t border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50">
                <a 
                  href={resume} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Document in New Tab
                </a>
                <button
                  type="button"
                  onClick={() => setShowResumeModal(false)}
                  className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const SectionTitle = ({ icon: Icon, title, desc }: any) => (
    <div className="mb-6">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>
      </div>
      {desc && <p className="text-sm text-slate-500 mt-2 ml-10">{desc}</p>}
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
      {/* Header and Mode Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200/60 dark:border-white/10 pb-6 gap-4">
        <div className="text-left">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Global Hacker Profile</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your identity, portfolio, and hackathon preferences once.</p>
        </div>
        <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-inner self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setPreviewMode(false)}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              !previewMode 
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-md font-bold" 
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Edit Mode
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode(true)}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              previewMode 
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-md font-bold" 
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Preview Mode
          </button>
        </div>
      </div>

      {message && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold flex items-center gap-2 sticky top-4 z-50 shadow-xl backdrop-blur-md">
          <CheckCircle2 className="w-5 h-5" />
          {message}
        </motion.div>
      )}

      {error && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-2 sticky top-4 z-50 shadow-xl backdrop-blur-md">
          <Shield className="w-5 h-5" />
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* Basic Info */}
        <div className="glass border border-slate-200/60 dark:border-white/10 rounded-3xl p-6 sm:p-8">
          <SectionTitle icon={User} title="Basic Info" desc="Your personal details for swag and communication." />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ml-0 md:ml-10">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
              <input type="text" value={name} disabled className="input-base w-full opacity-70 cursor-not-allowed" />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Gender</label>
              <select value={gender} onChange={e => setGender(e.target.value)} className="input-base w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">T-Shirt Size</label>
              <select value={tshirtSize} onChange={e => setTshirtSize(e.target.value)} className="input-base w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                <option value="">Select Size</option>
                <option value="S">Small (S)</option>
                <option value="M">Medium (M)</option>
                <option value="L">Large (L)</option>
                <option value="XL">Extra Large (XL)</option>
                <option value="XXL">Double Extra Large (XXL)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">City</label>
              <input type="text" placeholder="Mumbai, India" value={city} onChange={e => setCity(e.target.value)} className="input-base w-full" />
            </div>
          </div>
        </div>

        {/* Contact & Emergency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass border border-slate-200/60 dark:border-white/10 rounded-3xl p-6 sm:p-8">
            <SectionTitle icon={Phone} title="How Can We Reach You?" desc="For updates and communication." />
            <div className="space-y-6 ml-0 md:ml-10">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <div className="flex gap-3">
                  <input type="email" value={email} disabled className="input-base w-full opacity-70 cursor-not-allowed" />
                  <div className="flex items-center gap-1 px-3 py-2 bg-emerald-500/10 text-emerald-600 rounded-xl text-xs font-bold border border-emerald-500/20">
                    <Check className="w-3 h-3" /> Verified
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                <input type="text" placeholder="+91 9000000000" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="input-base w-full" />
              </div>
            </div>
          </div>

          <div className="glass border border-slate-200/60 dark:border-white/10 rounded-3xl p-6 sm:p-8 border-t-4 border-t-red-500/50">
            <SectionTitle icon={AlertTriangle} title="Emergency Contact" desc="For emergencies during events." />
            <div className="space-y-6 ml-0 md:ml-10">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Emergency Contact Name</label>
                <input type="text" placeholder="Jane Doe" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} className="input-base w-full" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Emergency Contact Number</label>
                <input type="text" placeholder="+91 9000000000" value={emergencyNumber} onChange={e => setEmergencyNumber(e.target.value)} className="input-base w-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Education */}
        <div className="glass border border-slate-200/60 dark:border-white/10 rounded-3xl p-6 sm:p-8">
          <SectionTitle icon={Book} title="Education" desc="Let organizers know your academic background." />
          <div className="space-y-6 ml-0 md:ml-10">
            <label className="flex items-center gap-3 p-4 border border-slate-200 dark:border-white/10 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <input type="checkbox" checked={!hasFormalEducation} onChange={(e) => setHasFormalEducation(!e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
              <span className="text-sm font-semibold text-slate-900 dark:text-white">I don't have a formal education</span>
            </label>

            {hasFormalEducation && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-white/10">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Educational Institution</label>
                  <input type="text" placeholder="e.g. Stanford University" value={institution} onChange={e => setInstitution(e.target.value)} className="input-base w-full" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Degree Type</label>
                  <select value={degreeType} onChange={e => setDegreeType(e.target.value)} className="input-base w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    <option value="">Select Degree</option>
                    <option value="High School">High School</option>
                    <option value="Bachelors">Bachelors</option>
                    <option value="Masters">Masters</option>
                    <option value="PhD">PhD</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Field of Study</label>
                  <input type="text" placeholder="e.g. Computer Science" value={fieldOfStudy} onChange={e => setFieldOfStudy(e.target.value)} className="input-base w-full" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Expected Grad Year</label>
                  <input type="number" placeholder="2026" value={gradYear} onChange={e => setGradYear(e.target.value)} className="input-base w-full" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Expected Grad Month</label>
                  <select value={gradMonth} onChange={e => setGradMonth(e.target.value)} className="input-base w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    <option value="">Select Month</option>
                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Dietary */}
        <div className="glass border border-slate-200/60 dark:border-white/10 rounded-3xl p-6 sm:p-8">
          <SectionTitle icon={Coffee} title="Dietary Preferences" desc="So we can arrange the best food for you." />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ml-0 md:ml-10">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dietary Preference</label>
              <select value={dietaryPreference} onChange={e => setDietaryPreference(e.target.value)} className="input-base w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                <option value="">No Restrictions</option>
                <option value="Vegetarian">Vegetarian</option>
                <option value="Non-Vegetarian">Non-Vegetarian</option>
                <option value="Vegan">Vegan</option>
                <option value="Jain">Jain</option>
                <option value="Halal">Halal</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Allergies (if any)</label>
              <input type="text" placeholder="e.g. Peanuts, Gluten" value={allergies} onChange={e => setAllergies(e.target.value)} className="input-base w-full" />
            </div>
          </div>
        </div>

        {/* Tell Your Story */}
        <div className="glass border border-slate-200/60 dark:border-white/10 rounded-3xl p-6 sm:p-8">
          <SectionTitle icon={FileText} title="Tell Your Story" desc="Give organizers an idea of who you are." />
          <div className="space-y-6 ml-0 md:ml-10">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bio (Short summary)</label>
              <textarea placeholder="I am a passionate developer building tools for..." value={bio} onChange={e => setBio(e.target.value)} className="input-base w-full min-h-[100px] resize-y" />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Readme (Markdown supported)</label>
              <textarea placeholder="## Hi there 👋&#10;Here are some of my top projects..." value={readmeMd} onChange={e => setReadmeMd(e.target.value)} className="input-base w-full min-h-[200px] font-mono text-sm resize-y bg-slate-950 text-slate-300 border-slate-800" />
            </div>
          </div>
        </div>

        {/* Portfolio & Skills */}
        <div className="glass border border-slate-200/60 dark:border-white/10 rounded-3xl p-6 sm:p-8">
          <SectionTitle icon={Globe} title="Portfolio & Skills" desc="Showcase your best work and find team members." />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ml-0 md:ml-10 mb-8">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">GitHub URL</label>
              <input type="url" placeholder="https://github.com/..." value={github} onChange={e => setGithub(e.target.value)} className="input-base w-full" />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">LinkedIn URL</label>
              <input type="url" placeholder="https://linkedin.com/in/..." value={linkedin} onChange={e => setLinkedin(e.target.value)} className="input-base w-full" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Resume Link (Drive/PDF URL)</label>
              <input type="url" placeholder="https://drive.google.com/..." value={resume} onChange={e => setResume(e.target.value)} className="input-base w-full" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tech Stack (comma separated)</label>
              <input type="text" placeholder="React, Go, Python..." value={skills} onChange={e => setSkills(e.target.value)} className="input-base w-full" />
            </div>
          </div>
        </div>

        <motion.div className="sticky bottom-6 z-50 flex justify-end">
          <motion.button
            type="submit"
            disabled={submitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full sm:w-auto px-12 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-blue-600 dark:hover:bg-blue-500 dark:hover:text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-2xl shadow-slate-900/20 flex items-center justify-center gap-3 text-sm cursor-pointer border border-transparent hover:border-blue-400/30"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving Profile...
              </>
            ) : (
              "Save Hacker Profile"
            )}
          </motion.button>
        </motion.div>

      </form>
    </div>
  );
}
