"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

export default function CommunityHub() {
  const [posts, setPosts] = useState<any[]>([]);
  const [category, setCategory] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postCategory, setPostCategory] = useState("General");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const qs = category ? `?category=${category}` : "";
      const data = await fetchApi(`/community${qs}`);
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    
    setIsSubmitting(true);
    try {
      await fetchApi("/community", {
        method: "POST",
        body: JSON.stringify({ title, content, category: postCategory }),
      });
      setIsModalOpen(false);
      setTitle("");
      setContent("");
      fetchPosts();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Community Hub</h1>
            <p className="text-slate-500">Share ideas, find teammates, and post snippets.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-blue-600 transition"
          >
            New Post
          </button>
        </header>

        {/* Filters */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {["", "General", "Idea Pitch", "Looking For Group"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                category === cat 
                  ? "bg-primary text-white" 
                  : "bg-surface border border-slate-200 dark:border-slate-800 text-foreground hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {cat || "All Posts"}
            </button>
          ))}
        </div>

        {/* Feed */}
        <div className="space-y-6">
          {isLoading ? (
            <p className="text-slate-500 text-center py-12">Loading posts...</p>
          ) : posts.length === 0 ? (
            <p className="text-slate-500 text-center py-12">No posts found in this category.</p>
          ) : (
            posts.map((post) => (
              <motion.div 
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm"
              >
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-foreground">{post.title}</h2>
                  <span className="px-3 py-1 bg-blue-500/10 text-primary text-xs font-bold rounded-full">
                    {post.category}
                  </span>
                </div>
                {/* Rich Text Markdown Render */}
                <div className="prose dark:prose-invert max-w-none prose-sm sm:prose-base prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800">
                  <ReactMarkdown>{post.content}</ReactMarkdown>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  Posted on {new Date(post.created_at).toLocaleString()}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Creation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-foreground mb-6">Create New Post</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Title</label>
                  <input required value={title} onChange={e => setTitle(e.target.value)} type="text" className="w-full p-3 rounded-lg bg-background border border-slate-200 dark:border-slate-700 text-foreground" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Category</label>
                  <select value={postCategory} onChange={e => setPostCategory(e.target.value)} className="w-full p-3 rounded-lg bg-background border border-slate-200 dark:border-slate-700 text-foreground">
                    <option value="General">General</option>
                    <option value="Idea Pitch">Idea Pitch</option>
                    <option value="Looking For Group">Looking For Group</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1 flex justify-between">
                    <span>Content</span>
                    <span className="text-slate-500 text-xs font-normal">Markdown Supported</span>
                  </label>
                  <textarea required value={content} onChange={e => setContent(e.target.value)} rows={6} className="w-full p-3 rounded-lg bg-background border border-slate-200 dark:border-slate-700 text-foreground font-mono text-sm resize-none" placeholder="Write your post... Use ``` for code blocks!" />
                </div>
                <div className="flex justify-end gap-3 mt-8">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-lg font-semibold text-foreground hover:bg-slate-200 dark:hover:bg-slate-800 transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-blue-600 transition">
                    {isSubmitting ? "Posting..." : "Post"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
