(() => {
  const DB_NAME = "mission-control";
  const DB_VERSION = 1;
  const STORE_NAMES = [
    "agents",
    "tasks",
    "messages",
    "activities",
    "documents",
  ];

  let dbPromise = null;

  function generateId(prefix) {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return `${prefix}:${crypto.randomUUID()}`;
    }
    return `${prefix}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
  }

  function openDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onupgradeneeded = () => {
        const db = request.result;
        STORE_NAMES.forEach((name) => {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: "id" });
          }
        });
      };
      request.onsuccess = () => resolve(request.result);
    });

    return dbPromise;
  }

  async function withStore(storeName, mode, handler) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);

      let result;
      try {
        result = handler(store, tx);
      } catch (error) {
        reject(error);
        return;
      }

      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async function addRecord(storeName, record) {
    const data = { ...record };
    if (!data.id) data.id = generateId(storeName);
    if (!data.createdAt) data.createdAt = new Date().toISOString();
    data.updatedAt = new Date().toISOString();

    await withStore(storeName, "readwrite", (store) => store.add(data));
    return data;
  }

  async function getRecord(storeName, id) {
    return withStore(storeName, "readonly", (store) =>
      new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      })
    );
  }

  async function getAllRecords(storeName) {
    return withStore(storeName, "readonly", (store) =>
      new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      })
    );
  }

  async function updateRecord(storeName, id, updates) {
    return withStore(storeName, "readwrite", (store) =>
      new Promise((resolve, reject) => {
        const getRequest = store.get(id);
        getRequest.onerror = () => reject(getRequest.error);
        getRequest.onsuccess = () => {
          const existing = getRequest.result;
          if (!existing) {
            resolve(null);
            return;
          }
          const updated = {
            ...existing,
            ...updates,
            id,
            updatedAt: new Date().toISOString(),
          };
          const putRequest = store.put(updated);
          putRequest.onerror = () => reject(putRequest.error);
          putRequest.onsuccess = () => resolve(updated);
        };
      })
    );
  }

  async function removeRecord(storeName, id) {
    await withStore(storeName, "readwrite", (store) => store.delete(id));
    return true;
  }

  async function clearStore(storeName) {
    await withStore(storeName, "readwrite", (store) => store.clear());
    return true;
  }

  async function seedDefaultAgents() {
    const existing = await getAllRecords("agents");
    if (existing.length > 0) return;

    const defaults = [
      {
        id: "agent:main:main",
        name: "Abbe",
        role: "Squad Lead",
        emoji: "🧠",
      },
      {
        id: "agent:sales:main",
        name: "Seidel",
        role: "Sales",
        emoji: "💼",
      },
      {
        id: "agent:marketing:main",
        name: "Iris",
        role: "Marketing",
        emoji: "🎨",
      },
      {
        id: "agent:engineering:main",
        name: "Theia",
        role: "Engineering",
        emoji: "🔬",
      },
      {
        id: "agent:operations:main",
        name: "Photon",
        role: "Operations",
        emoji: "⚡",
      },
      {
        id: "agent:softwaredeveloper:main",
        name: "Zernike",
        role: "Software Dev",
        emoji: "💻",
      },
    ];

    for (const agent of defaults) {
      await addRecord("agents", agent);
    }
  }

  async function init() {
    await openDB();
    // Skip seeding if Convex will be used (Convex has the real data)
    // The seed was only for offline/demo mode
    // await seedDefaultAgents();
    return true;
  }

  function storeAPI(storeName) {
    return {
      add: (record) => addRecord(storeName, record),
      get: (id) => getRecord(storeName, id),
      list: () => getAllRecords(storeName),
      update: (id, updates) => updateRecord(storeName, id, updates),
      remove: (id) => removeRecord(storeName, id),
      clear: () => clearStore(storeName),
    };
  }

  window.DB = {
    init,
    add: addRecord,
    get: getRecord,
    list: getAllRecords,
    update: updateRecord,
    remove: removeRecord,
    clear: clearStore,
    agents: storeAPI("agents"),
    tasks: storeAPI("tasks"),
    messages: storeAPI("messages"),
    activities: storeAPI("activities"),
    documents: storeAPI("documents"),
  };
})();
