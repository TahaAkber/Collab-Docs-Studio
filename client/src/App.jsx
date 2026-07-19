import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = "http://localhost:3001/api";

function App() {
  const [currentUserId, setCurrentUserId] = useState("user-1");
  const [users, setUsers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [activeDocumentId, setActiveDocumentId] = useState(null);
  const [title, setTitle] = useState("");
  const [shareTarget, setShareTarget] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const editorRef = useRef(null);

  const activeDocument = useMemo(
    () => documents.find((doc) => doc.id === activeDocumentId) || null,
    [documents, activeDocumentId],
  );

  async function loadUsers() {
    const res = await fetch(`${API_BASE}/users`);
    const data = await res.json();
    setUsers(data);
  }

  async function loadDocuments() {
    const res = await fetch(`${API_BASE}/documents?userId=${currentUserId}`);
    const data = await res.json();
    setDocuments(data);
    if (!activeDocumentId && data.length > 0) {
      setActiveDocumentId(data[0].id);
    }
  }

  async function createDocument() {
    setLoading(true);
    const res = await fetch(`${API_BASE}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Untitled ${documents.length + 1}`,
        content: "<h2>Start writing...</h2>",
        ownerId: currentUserId,
      }),
    });
    const newDoc = await res.json();
    if (!res.ok) {
      setStatus(newDoc.error || "Unable to create document.");
      setLoading(false);
      return;
    }
    setStatus("Document created.");
    await loadDocuments();
    setActiveDocumentId(newDoc.id);
    setLoading(false);
  }

  async function saveDocument() {
    if (!activeDocument) return;
    setLoading(true);
    const res = await fetch(`${API_BASE}/documents/${activeDocument.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content: editorRef.current?.innerHTML || activeDocument.content,
        ownerId: currentUserId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Save failed.");
      setLoading(false);
      return;
    }
    setStatus("Saved.");
    await loadDocuments();
    setLoading(false);
  }

  async function shareDocument() {
    if (!activeDocument || !shareTarget) return;
    setLoading(true);
    const res = await fetch(
      `${API_BASE}/documents/${activeDocument.id}/share`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: shareTarget }),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Sharing failed.");
      setLoading(false);
      return;
    }
    setStatus("Document shared.");
    await loadDocuments();
    setShareTarget("");
    setLoading(false);
  }

  async function uploadAndImport() {
    if (!activeDocument || !uploadFile) return;
    const formData = new FormData();
    formData.append("file", uploadFile);
    setLoading(true);
    const res = await fetch(
      `${API_BASE}/documents/${activeDocument.id}/upload`,
      {
        method: "POST",
        body: formData,
      },
    );
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Upload failed.");
      setLoading(false);
      return;
    }
    setStatus(data.message);
    setUploadFile(null);
    await loadDocuments();
    setLoading(false);
  }

  function applyFormat(command, value = null) {
    document.execCommand(command, false, value);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [currentUserId]);

  useEffect(() => {
    if (activeDocument) {
      setTitle(activeDocument.title);
      if (editorRef.current) {
        editorRef.current.innerHTML = activeDocument.content || "<p></p>";
      }
    }
  }, [activeDocument]);

  return (
    <div className="app-shell">
      <aside className="side-panel">
        <div className="brand-box">
          <p className="eyebrow">Collab Docs Studio</p>
          <h1>Shared drafting workspace</h1>
        </div>

        <label className="field-label">
          Active user
          <select
            value={currentUserId}
            onChange={(e) => setCurrentUserId(e.target.value)}
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </label>

        <button className="primary-btn" onClick={createDocument}>
          New document
        </button>

        <div className="doc-list">
          {documents.map((doc) => (
            <button
              key={doc.id}
              className={`doc-card ${doc.id === activeDocumentId ? "active" : ""}`}
              onClick={() => setActiveDocumentId(doc.id)}
            >
              <strong>{doc.title}</strong>
              <small>
                {doc.isOwnedByCurrentUser ? "Owned by you" : "Shared with you"}
              </small>
              <span>{doc.owner.name}</span>
            </button>
          ))}
        </div>
      </aside>

      <main className="editor-panel">
        <div className="toolbar">
          <button onClick={() => applyFormat("bold")}>
            <strong>B</strong>
          </button>
          <button onClick={() => applyFormat("italic")}>
            <em>I</em>
          </button>
          <button onClick={() => applyFormat("underline")}>
            <u>U</u>
          </button>
          <button onClick={() => applyFormat("formatBlock", "h2")}>
            Heading
          </button>
          <button onClick={() => applyFormat("insertUnorderedList")}>
            • List
          </button>
          <button onClick={() => applyFormat("insertOrderedList")}>
            1. List
          </button>
          <button className="primary-btn small" onClick={saveDocument}>
            Save
          </button>
        </div>

        <div className="meta-bar">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title"
          />
          <span>{status || "Ready to draft."}</span>
        </div>

        <div
          ref={editorRef}
          className="editor-surface"
          contentEditable="true"
          suppressContentEditableWarning
        />

        <div className="action-grid">
          <div className="action-card">
            <h3>Share</h3>
            <select
              value={shareTarget}
              onChange={(e) => setShareTarget(e.target.value)}
            >
              <option value="">Choose a teammate</option>
              {users
                .filter((user) => user.id !== currentUserId)
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
            </select>
            <button onClick={shareDocument}>Grant access</button>
          </div>

          <div className="action-card">
            <h3>Upload .txt or .md</h3>
            <input
              type="file"
              accept=".txt,.md"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            />
            <button onClick={uploadAndImport}>Import into current doc</button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
