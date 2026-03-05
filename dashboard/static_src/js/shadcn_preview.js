        (function () {
            const root = document.getElementById("ui-preview-shell");
            if (!root) {
                return;
            }

            const sections = Array.from(root.querySelectorAll(".ui-preview-section"));
            const visible = root.querySelector("#ui-preview-visible-count");
            const hidden = root.querySelector("#ui-preview-hidden-count");
            const childSelect = root.querySelector("#ui-preview-child-select");
            const refreshButton = root.querySelector("#ui-preview-refresh");
            const cards = Object.fromEntries(
                Array.from(root.querySelectorAll("[data-card]"))
                    .map((cardNode) => [cardNode.dataset.card, { cardNode, body: cardNode.querySelector("p") }])
            );
            const tooltip = document.getElementById("ui-preview-tooltip");

            const timelineChart = root.querySelector("#ui-sleep-timeline-chart");
            const timelineAxis = root.querySelector("#ui-sleep-axis");
            const timelineDateLabel = root.querySelector("#ui-sleep-date-label");
            const timelineDateInput = root.querySelector("#ui-sleep-date-input");
            const timelinePrev = root.querySelector("#ui-sleep-date-prev");
            const timelineNext = root.querySelector("#ui-sleep-date-next");
            const nowLine = root.querySelector("#ui-sleep-now-line");
            const timelineWrap = root.querySelector("#ui-sleep-timeline-wrap");

            const sleepTimerAction = root.querySelector("#ui-sleep-timer-action");
            const sleepTimerTime = root.querySelector("#ui-sleep-timer-time");
            const sleepTimerCaption = root.querySelector("#ui-sleep-timer-caption");
            const sleepTimerDots = root.querySelector("#ui-sleep-timer-dots");
            const sleepTimerNote = root.querySelector("#ui-sleep-timer-note");
            const recommendationsRoot = root.querySelector("#ui-reco-content");
            const fixedChildId = root.dataset.fixedChildId || "";
            const childDashboardUrlTemplate = root.dataset.childDashboardUrlTemplate || "";

            const selectionKey = "ui-preview-selected-child";
            const timerKey = "ui-preview-sleep-timer";

            const state = {
                selectedChildId: null,
                timelineDate: localDateString(new Date()),
                timer: {
                    running: false,
                    startMs: null,
                    apiTimerId: null,
                    childId: null,
                    intervalId: null
                }
            };
            const childrenById = new Map();

            function localDateString(date) {
                const dt = new Date(date);
                const year = dt.getFullYear();
                const month = String(dt.getMonth() + 1).padStart(2, "0");
                const day = String(dt.getDate()).padStart(2, "0");
                return `${year}-${month}-${day}`;
            }

            function parseDateInput(value) {
                const [year, month, day] = (value || "").split("-").map((v) => parseInt(v, 10));
                if (!year || !month || !day) {
                    return null;
                }
                return new Date(year, month - 1, day);
            }

            function startOfDay(dateString) {
                const dt = parseDateInput(dateString);
                return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0);
            }

            function endOfDay(dateString) {
                const dt = parseDateInput(dateString);
                return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 23, 59, 59, 999);
            }

            function formatDisplayDate(value) {
                const dt = parseDateInput(value);
                return dt ? dt.toLocaleDateString() : value;
            }

            function refreshTimelineHeader() {
                if (!timelineDateInput || !timelineDateLabel) {
                    return;
                }
                timelineDateInput.value = state.timelineDate;
                timelineDateLabel.textContent = formatDisplayDate(state.timelineDate);
            }

            function refreshCounts() {
                const hiddenCount = sections.filter((section) => section.dataset.collapsed === "1").length;
                visible.textContent = `${sections.length - hiddenCount} visible`;
                hidden.textContent = `${hiddenCount} hidden`;
            }

            function asItems(payload) {
                if (!payload) {
                    return [];
                }
                if (Array.isArray(payload)) {
                    return payload;
                }
                if (Array.isArray(payload.results)) {
                    return payload.results;
                }
                return [];
            }

            function durationMinutes(durationValue) {
                if (!durationValue) {
                    return 0;
                }
                const parts = durationValue.split(":").map((value) => parseInt(value, 10));
                if (parts.length !== 3 || parts.some(Number.isNaN)) {
                    return 0;
                }
                return (parts[0] * 60) + parts[1] + Math.round(parts[2] / 60);
            }

            function formatDateTime(value) {
                if (!value) {
                    return "n/a";
                }
                try {
                    return new Date(value).toLocaleString();
                } catch (error) {
                    return value;
                }
            }

            function formatTime(value) {
                if (!value) {
                    return "n/a";
                }
                try {
                    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                } catch (error) {
                    return value;
                }
            }

            function isToday(value) {
                if (!value) {
                    return false;
                }
                const when = new Date(value);
                const now = new Date();
                return when.getFullYear() === now.getFullYear()
                    && when.getMonth() === now.getMonth()
                    && when.getDate() === now.getDate();
            }

            function setCard(cardId, text) {
                const target = cards[cardId];
                if (target && target.body) {
                    target.body.textContent = text;
                }
            }

            function escapeHtml(value) {
                return String(value == null ? "" : value)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/\"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            }

            function setCardHtml(cardId, html) {
                const target = cards[cardId];
                if (target && target.body) {
                    target.body.innerHTML = html;
                }
            }

            function getCookie(name) {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) {
                    return parts.pop().split(";").shift();
                }
                return "";
            }

            function getCSRFToken() {
                const cookieToken = getCookie("csrftoken");
                if (cookieToken && cookieToken.length >= 32) {
                    return cookieToken;
                }
                const inputTokenElement = document.querySelector('input[name="csrfmiddlewaretoken"]');
                const inputToken = inputTokenElement ? inputTokenElement.value : "";
                if (inputToken && inputToken !== "NOTPROVIDED") {
                    return inputToken;
                }
                return "";
            }

            async function fetchJSON(url) {
                const response = await fetch(url, {
                    credentials: "same-origin",
                    headers: { Accept: "application/json" }
                });
                if (!response.ok) {
                    throw new Error(`Request failed (${response.status})`);
                }
                return response.json();
            }

            async function fetchMutation(url, method, payload) {
                const csrfToken = getCSRFToken();
                const headers = {
                    Accept: "application/json"
                };
                if (csrfToken) {
                    headers["X-CSRFToken"] = csrfToken;
                }
                const options = {
                    method,
                    credentials: "same-origin",
                    headers
                };
                if (payload !== undefined) {
                    headers["Content-Type"] = "application/json";
                    options.body = JSON.stringify(payload);
                }

                const response = await fetch(url, options);
                if (!response.ok) {
                    let detail = `Request failed (${response.status})`;
                    try {
                        const json = await response.json();
                        detail = json.detail || JSON.stringify(json);
                    } catch (error) {
                        // ignore JSON parsing errors
                    }
                    throw new Error(detail);
                }
                if (response.status === 204) {
                    return null;
                }
                try {
                    return await response.json();
                } catch (error) {
                    return null;
                }
            }

            function formatMethod(value) {
                if (!value) {
                    return "n/a";
                }
                return value.toString().replace(/[_-]+/g, " ");
            }

            function formatAgeSince(value) {
                if (!value) {
                    return "n/a";
                }
                const diffMs = Date.now() - new Date(value).getTime();
                const minutes = Math.max(0, Math.floor(diffMs / 60000));
                if (minutes < 60) {
                    return `${minutes}m ago`;
                }
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                return `${hours}h ${mins}m ago`;
            }

            function richCard(main, meta, chips) {
                const chipHtml = (chips || [])
                    .map((chip) => `<span class="ui-card-chip ${escapeHtml(chip.tone || "")}">${escapeHtml(chip.label)}</span>`)
                    .join("");
                return `
                    <div class="ui-card-rich">
                        <div class="ui-card-main">${escapeHtml(main)}</div>
                        <div class="ui-card-meta">${escapeHtml(meta)}</div>
                        ${chipHtml ? `<div class="ui-card-chips">${chipHtml}</div>` : ""}
                    </div>
                `;
            }

            function recommendationStatusLabel(status) {
                const map = {
                    ok: "OK",
                    no_data: "No Data",
                    nighttime: "Nighttime",
                    overtired_risk: "Overdue"
                };
                return map[status] || "Info";
            }

            function renderRecommendationLine(title, entry, includeTarget) {
                if (!entry) {
                    return `
                        <div class="ui-reco-row">
                            <div class="ui-reco-title">${title}</div>
                            <div class="ui-reco-main">n/a</div>
                        </div>
                    `;
                }

                const status = entry.status || "no_data";
                const bits = [];
                if (entry.ideal) {
                    bits.push(`ideal ${formatTime(entry.ideal)}`);
                }
                if (entry.earliest && entry.latest) {
                    bits.push(`window ${formatTime(entry.earliest)}-${formatTime(entry.latest)}`);
                }
                if (includeTarget && entry.target_bedtime) {
                    bits.push(`target ${formatTime(entry.target_bedtime)}`);
                }

                let reason = "";
                if (entry.reason) {
                    reason = `<div class="ui-reco-reason">${entry.reason.replace(/_/g, " ")}</div>`;
                }

                return `
                    <div class="ui-reco-row">
                        <div class="ui-reco-title">${title}</div>
                        <div>
                            <div class="ui-reco-main">
                                <span class="ui-reco-badge ${status}">${recommendationStatusLabel(status)}</span>
                                <span class="ui-reco-meta">${bits.join(" | ") || "no schedule available"}</span>
                            </div>
                            ${reason}
                        </div>
                    </div>
                `;
            }

            function renderRecommendations(payload) {
                if (!recommendationsRoot) {
                    return;
                }
                if (!payload) {
                    recommendationsRoot.innerHTML = `
                        <div class="ui-reco-row"><div class="ui-reco-title">Nap</div><div>n/a</div></div>
                        <div class="ui-reco-row"><div class="ui-reco-title">Bedtime</div><div>n/a</div></div>
                    `;
                    return;
                }

                recommendationsRoot.innerHTML = `
                    ${renderRecommendationLine("Nap", payload.nap, false)}
                    ${renderRecommendationLine("Bedtime", payload.bedtime, true)}
                `;
            }

            async function loadSleepRecommendations(child) {
                if (!child || !child.slug) {
                    renderRecommendations(null);
                    return;
                }
                const payload = await fetchJSON(`/api/children/${encodeURIComponent(child.slug)}/sleep-recommendations/`);
                renderRecommendations(payload);
            }

            function showTooltip(text, x, y) {
                tooltip.textContent = text;
                tooltip.style.opacity = "1";
                tooltip.style.left = `${x + 14}px`;
                tooltip.style.top = `${y + 12}px`;
            }

            function hideTooltip() {
                tooltip.style.opacity = "0";
            }

            function minutesBetween(startDate, endDate) {
                return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
            }

            function renderSleepTimeline(entries, dateString) {
                if (!timelineChart || !timelineAxis) {
                    return;
                }
                timelineChart.innerHTML = "";
                timelineAxis.innerHTML = "";

                for (let hour = 0; hour < 24; hour += 1) {
                    const slot = document.createElement("div");
                    slot.className = "ui-sleep-slot";

                    const slotStart = startOfDay(dateString);
                    slotStart.setHours(hour, 0, 0, 0);
                    const slotEnd = new Date(slotStart.getTime());
                    slotEnd.setHours(hour + 1, 0, 0, 0);

                    let best = null;
                    let bestMinutes = 0;

                    entries.forEach((entry) => {
                        const entryStart = new Date(entry.start);
                        const entryEnd = new Date(entry.end);
                        const overlapStart = entryStart > slotStart ? entryStart : slotStart;
                        const overlapEnd = entryEnd < slotEnd ? entryEnd : slotEnd;
                        const overlap = minutesBetween(overlapStart, overlapEnd);
                        if (overlap > bestMinutes) {
                            bestMinutes = overlap;
                            best = entry;
                        }
                    });

                    if (best && bestMinutes > 0) {
                        const bar = document.createElement("div");
                        bar.className = "ui-sleep-bar";
                        bar.dataset.kind = best.nap ? "nap" : "sleep";
                        bar.style.height = `${Math.max(8, (bestMinutes / 60) * 100)}%`;

                        const fullStart = new Date(best.start);
                        const fullEnd = new Date(best.end);
                        const fullMinutes = durationMinutes(best.duration);
                        const tooltipText = `${best.nap ? "Nap" : "Sleep"} | ${fullStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${fullEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} | ${fullMinutes} min`;

                        bar.addEventListener("mouseenter", (event) => showTooltip(tooltipText, event.clientX, event.clientY));
                        bar.addEventListener("mousemove", (event) => showTooltip(tooltipText, event.clientX, event.clientY));
                        bar.addEventListener("mouseleave", hideTooltip);

                        slot.appendChild(bar);
                    }

                    timelineChart.appendChild(slot);

                    const label = document.createElement("span");
                    label.textContent = String(hour).padStart(2, "0");
                    timelineAxis.appendChild(label);
                }

                const today = localDateString(new Date());
                if (dateString === today) {
                    if (!nowLine) {
                        return;
                    }
                    const now = new Date();
                    const minutes = (now.getHours() * 60) + now.getMinutes() + (now.getSeconds() / 60);
                    const percent = (minutes / 1440) * 100;
                    nowLine.hidden = false;
                    nowLine.style.left = `calc(${percent}% + 0.5rem)`;
                } else if (nowLine) {
                    nowLine.hidden = true;
                }
            }

            async function loadSleepTimeline(childId) {
                if (!timelineChart || !timelineAxis) {
                    return;
                }
                const dayStart = startOfDay(state.timelineDate);
                const dayEnd = endOfDay(state.timelineDate);
                const query = [
                    `child=${encodeURIComponent(childId)}`,
                    `start_max=${encodeURIComponent(dayEnd.toISOString())}`,
                    `end_min=${encodeURIComponent(dayStart.toISOString())}`,
                    "limit=250"
                ].join("&");

                const payload = await fetchJSON(`/api/sleep/?${query}`);
                const entries = asItems(payload)
                    .filter((entry) => entry.start && entry.end)
                    .sort((a, b) => new Date(a.start) - new Date(b.start));

                renderSleepTimeline(entries, state.timelineDate);
            }

            function formatElapsed(ms) {
                const total = Math.max(0, Math.floor(ms / 1000));
                const hours = Math.floor(total / 3600);
                const minutes = Math.floor((total % 3600) / 60);
                const seconds = total % 60;
                if (total < 60) {
                    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
                }
                return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
            }

            function formatSleepCaption(ms) {
                const minutes = Math.floor(ms / 60000);
                if (minutes < 90) {
                    return `Sleeping: ${minutes} min`;
                }
                const hours = (minutes / 60).toFixed(1);
                return `Sleeping: ${hours} h`;
            }

            function persistTimerState() {
                localStorage.setItem(timerKey, JSON.stringify(state.timer));
            }

            function restoreTimerState() {
                try {
                    const saved = JSON.parse(localStorage.getItem(timerKey) || "null");
                    if (!saved || !saved.running || !saved.startMs) {
                        return;
                    }
                    state.timer = {
                        running: true,
                        startMs: saved.startMs,
                        apiTimerId: saved.apiTimerId || null,
                        childId: saved.childId || null,
                        intervalId: null
                    };
                } catch (error) {
                    // ignore broken localStorage values
                }
            }

            function clearTimerState() {
                localStorage.removeItem(timerKey);
            }

            function updateSleepTimerUI() {
                if (!sleepTimerTime || !sleepTimerCaption || !sleepTimerAction || !sleepTimerDots) {
                    return;
                }
                const elapsed = state.timer.running ? Date.now() - state.timer.startMs : 0;
                sleepTimerTime.textContent = formatElapsed(elapsed);
                sleepTimerCaption.textContent = formatSleepCaption(elapsed);

                if (state.timer.running) {
                    sleepTimerAction.textContent = "Stop";
                    sleepTimerAction.classList.remove("btn-primary");
                    sleepTimerAction.classList.add("btn-danger");
                    sleepTimerDots.classList.add("running");
                } else {
                    sleepTimerAction.textContent = "Start";
                    sleepTimerAction.classList.add("btn-primary");
                    sleepTimerAction.classList.remove("btn-danger");
                    sleepTimerDots.classList.remove("running");
                }

            }

            function startTimerTicking() {
                if (state.timer.intervalId) {
                    clearInterval(state.timer.intervalId);
                }
                state.timer.intervalId = setInterval(updateSleepTimerUI, 1000);
                updateSleepTimerUI();
            }

            function stopTimerTicking() {
                if (state.timer.intervalId) {
                    clearInterval(state.timer.intervalId);
                }
                state.timer.intervalId = null;
                updateSleepTimerUI();
            }

            async function startSleepTimer() {
                if (!state.selectedChildId) {
                    sleepTimerNote.textContent = "Select a child first.";
                    return;
                }

                const payload = await fetchMutation("/api/timers/", "POST", {
                    child: Number(state.selectedChildId),
                    name: "Sleep preview timer"
                });

                state.timer.running = true;
                state.timer.startMs = new Date(payload.start).getTime();
                state.timer.apiTimerId = payload.id;
                state.timer.childId = state.selectedChildId;
                if (sleepTimerNote) {
                    sleepTimerNote.textContent = "Timer running... Stop to create sleep entry.";
                }
                persistTimerState();
                startTimerTicking();
            }

            async function stopSleepTimer() {
                if (!state.timer.running || !state.timer.startMs || !state.selectedChildId) {
                    return;
                }

                const endMs = Date.now();
                const durationMin = Math.max(0, Math.round((endMs - state.timer.startMs) / 60000));
                const nap = durationMin < 120;

                await fetchMutation("/api/sleep/", "POST", {
                    child: Number(state.selectedChildId),
                    start: new Date(state.timer.startMs).toISOString(),
                    end: new Date(endMs).toISOString(),
                    nap
                });

                if (state.timer.apiTimerId) {
                    try {
                        await fetchMutation(`/api/timers/${state.timer.apiTimerId}/`, "DELETE");
                    } catch (error) {
                        // timer cleanup failure should not block entry creation
                    }
                }

                state.timer = {
                    running: false,
                    startMs: null,
                    apiTimerId: null,
                    childId: null,
                    intervalId: null
                };
                clearTimerState();
                stopTimerTicking();
                if (sleepTimerNote) {
                    sleepTimerNote.textContent = `Saved ${nap ? "nap" : "sleep"} entry (${durationMin} min).`;
                }

                await loadCards(state.selectedChildId);
            }

            async function loadChildren() {
                const payload = await fetchJSON("/api/children/?limit=100");
                const children = asItems(payload);
                childSelect.innerHTML = "";
                if (!children.length) {
                    childSelect.innerHTML = '<option value="">No children found</option>';
                    return [];
                }

                children.forEach((child) => {
                    childrenById.set(String(child.id), child);
                    const option = document.createElement("option");
                    option.value = String(child.id);
                    option.textContent = [child.first_name, child.last_name].filter(Boolean).join(" ").trim() || `Child ${child.id}`;
                    childSelect.appendChild(option);
                });

                if (fixedChildId) {
                    if (children.some((child) => String(child.id) === fixedChildId)) {
                        childSelect.value = fixedChildId;
                    } else {
                        childSelect.innerHTML = '<option value="">Configured child not found</option>';
                    }
                    return children;
                }

                const saved = localStorage.getItem(selectionKey);
                if (saved && children.some((child) => String(child.id) === saved)) {
                    childSelect.value = saved;
                }

                return children;
            }

            function navigateToChildDashboard(childId) {
                if (!fixedChildId || !childDashboardUrlTemplate) {
                    return false;
                }
                const childMeta = childrenById.get(String(childId));
                if (!childMeta || !childMeta.slug) {
                    return false;
                }
                const targetUrl = childDashboardUrlTemplate.replace(
                    "__CHILD_SLUG__",
                    encodeURIComponent(childMeta.slug),
                );
                if (targetUrl && window.location.pathname !== targetUrl) {
                    window.location.assign(targetUrl);
                    return true;
                }
                return false;
            }

            async function loadCards(childId) {
                if (!childId) {
                    return;
                }
                state.selectedChildId = String(childId);

                Object.keys(cards).forEach((key) => setCard(key, "Loading..."));

                const query = `child=${encodeURIComponent(childId)}`;
                const [changes, feedings, pumpings, sleeps, tummyTimes, timers] = await Promise.all([
                    fetchJSON(`/api/changes/?${query}&limit=20`),
                    fetchJSON(`/api/feedings/?${query}&limit=20`),
                    fetchJSON(`/api/pumping/?${query}&limit=20`),
                    fetchJSON(`/api/sleep/?${query}&limit=30`),
                    fetchJSON(`/api/tummy-times/?${query}&limit=20`),
                    fetchJSON(`/api/timers/?${query}&limit=5`)
                ]);

                const changeItems = asItems(changes);
                const feedingItems = asItems(feedings);
                const pumpingItems = asItems(pumpings);
                const sleepItems = asItems(sleeps);
                const tummyItems = asItems(tummyTimes);
                const timerItems = asItems(timers);

                const lastChange = changeItems[0];
                const lastFeeding = feedingItems[0];
                const lastPumping = pumpingItems[0];
                const lastSleep = sleepItems[0];
                const runningTimer = timerItems[0];

                if (lastChange) {
                    setCardHtml("last-nappy-change", richCard(
                        `${formatAgeSince(lastChange.time)}`,
                        `${formatDateTime(lastChange.time)}`,
                        [
                            { label: `wet: ${lastChange.wet ? "yes" : "no"}`, tone: "rose" },
                            { label: `solid: ${lastChange.solid ? "yes" : "no"}`, tone: "rose" }
                        ]
                    ));
                } else {
                    setCard("last-nappy-change", "No diaper changes yet");
                }
                const diaperTodayCount = changeItems.filter((item) => isToday(item.time)).length;
                setCardHtml("nappy-changes", richCard(
                    `${diaperTodayCount} changes today`,
                    `${changeItems.length} in recent history`,
                    [{ label: "diaper", tone: "rose" }]
                ));

                if (lastFeeding) {
                    setCardHtml("last-feeding", richCard(
                        `${durationMinutes(lastFeeding.duration)} min`,
                        `${formatDateTime(lastFeeding.start)} | amount: ${lastFeeding.amount || "n/a"}`,
                        [
                            { label: formatMethod(lastFeeding.method), tone: "sky" },
                            { label: formatMethod(lastFeeding.type), tone: "sky" }
                        ]
                    ));
                } else {
                    setCard("last-feeding", "No feedings yet");
                }

                const methodCounts = feedingItems.reduce((acc, item) => {
                    const key = formatMethod(item.method || "unknown");
                    acc[key] = (acc[key] || 0) + 1;
                    return acc;
                }, {});
                const topMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0];
                if (topMethod) {
                    setCardHtml("last-feeding-method", richCard(
                        topMethod[0],
                        `${topMethod[1]}x in recent entries`,
                        [{ label: "dominant method", tone: "sky" }]
                    ));
                } else {
                    setCard("last-feeding-method", "No feeding method available");
                }

                const feedingsToday = feedingItems.filter((item) => isToday(item.start));
                const avgDuration = feedingsToday.length
                    ? Math.round(feedingsToday.reduce((sum, item) => sum + durationMinutes(item.duration), 0) / feedingsToday.length)
                    : 0;
                setCardHtml("recent-feedings", richCard(
                    `${feedingsToday.length} feedings today`,
                    feedingsToday.length ? `avg duration ${avgDuration} min` : "no entries today",
                    [{ label: "today", tone: "sky" }]
                ));

                const breastfeedingToday = feedingsToday.filter((item) => String(item.method || "").toLowerCase().includes("breast")).length;
                const breastfeedingRecent = feedingItems.filter((item) => String(item.method || "").toLowerCase().includes("breast")).length;
                setCardHtml("breastfeeding", richCard(
                    `${breastfeedingToday} today`,
                    `${breastfeedingRecent} in recent entries`,
                    [{ label: "breastfeeding", tone: "sky" }]
                ));

                if (lastPumping) {
                    setCardHtml("last-pumping", richCard(
                        `${durationMinutes(lastPumping.duration)} min`,
                        `${formatDateTime(lastPumping.start)} | amount: ${lastPumping.amount || "n/a"}`,
                        [{ label: "pumping", tone: "violet" }]
                    ));
                } else {
                    setCard("last-pumping", "No pumping entries yet");
                }

                if (lastSleep) {
                    setCardHtml("last-sleep", richCard(
                        `${lastSleep.nap ? "Nap" : "Sleep"} | ${durationMinutes(lastSleep.duration)} min`,
                        `${formatDateTime(lastSleep.start)} - ${formatDateTime(lastSleep.end)}`,
                        [{ label: lastSleep.nap ? "nap" : "sleep", tone: "amber" }]
                    ));
                } else {
                    setCard("last-sleep", "No sleep entries yet");
                }

                const sleepToday = sleepItems.filter((item) => isToday(item.start));
                const napsToday = sleepToday.filter((item) => item.nap);
                const napMinutesToday = napsToday.reduce(
                    (acc, item) => acc + durationMinutes(item.duration),
                    0
                );
                const avgNapMinutes = napsToday.length
                    ? Math.round(napMinutesToday / napsToday.length)
                    : 0;
                const avgSleepMinutes = sleepItems.length
                    ? Math.round(
                        sleepItems.reduce(
                            (acc, item) => acc + durationMinutes(item.duration),
                            0
                        ) / sleepItems.length
                    )
                    : 0;

                setCardHtml("sleep-timers", richCard(
                    `${timerItems.length} timers`,
                    timerItems[0] ? `latest: ${timerItems[0].name || "Timer"} (${formatTime(timerItems[0].start)})` : "no active timer",
                    [{ label: timerItems[0] ? "running" : "idle", tone: "amber" }]
                ));
                setCardHtml("recent-sleep", richCard(
                    `${sleepToday.length} sleep entries today`,
                    `${sleepItems.length} in recent history`,
                    [{ label: "sleep log", tone: "amber" }]
                ));
                setCardHtml("todays-naps", richCard(
                    `${napMinutesToday} min`,
                    `${napsToday.length} naps today`,
                    [{ label: "nap", tone: "amber" }]
                ));
                setCardHtml("sleep-statistics", richCard(
                    `${avgNapMinutes} min avg nap`,
                    `${avgSleepMinutes} min avg sleep`,
                    [{ label: "statistics", tone: "amber" }]
                ));
                const childMeta = childrenById.get(String(childId));
                try {
                    await loadSleepRecommendations(childMeta);
                } catch (error) {
                    if (recommendationsRoot) {
                        recommendationsRoot.innerHTML = `
                            <div class="ui-reco-row">
                                <div class="ui-reco-title">Error</div>
                                <div>${error.message}</div>
                            </div>
                        `;
                    }
                }

                const tummyTodayMinutes = tummyItems
                    .filter((item) => isToday(item.start))
                    .reduce((acc, item) => acc + durationMinutes(item.duration), 0);
                setCardHtml("tummy-time", richCard(
                    `${tummyTodayMinutes} min today`,
                    `${tummyItems.length} recent tummy time entries`,
                    [{ label: "tummy time", tone: "emerald" }]
                ));

                if (runningTimer && !state.timer.running) {
                    if (sleepTimerNote) {
                        sleepTimerNote.textContent = `Existing running timer: ${runningTimer.name || "Timer"}`;
                    }
                }

                await loadSleepTimeline(childId);
            }

            root.querySelectorAll("[data-section-toggle]").forEach((button) => {
                button.addEventListener("click", () => {
                    const section = button.closest(".ui-preview-section");
                    if (!section) {
                        return;
                    }
                    const collapsed = section.dataset.collapsed === "1";
                    section.dataset.collapsed = collapsed ? "0" : "1";
                    button.textContent = collapsed ? "Hide" : "Show";
                    refreshCounts();
                });
            });

            childSelect.addEventListener("change", () => {
                if (navigateToChildDashboard(childSelect.value)) {
                    return;
                }
                if (!fixedChildId) {
                    localStorage.setItem(selectionKey, childSelect.value);
                }
                loadCards(childSelect.value).catch((error) => {
                    Object.keys(cards).forEach((key) => setCard(key, `Error loading data: ${error.message}`));
                });
            });

            refreshButton.addEventListener("click", () => {
                loadCards(childSelect.value).catch((error) => {
                    Object.keys(cards).forEach((key) => setCard(key, `Error loading data: ${error.message}`));
                });
            });

            if (timelinePrev && timelineNext && timelineDateInput) {
                timelinePrev.addEventListener("click", () => {
                    const dt = parseDateInput(state.timelineDate);
                    dt.setDate(dt.getDate() - 1);
                    state.timelineDate = localDateString(dt);
                    refreshTimelineHeader();
                    if (state.selectedChildId) {
                        loadSleepTimeline(state.selectedChildId).catch((error) => setCard("last-sleep", `Timeline error: ${error.message}`));
                    }
                });

                timelineNext.addEventListener("click", () => {
                    const dt = parseDateInput(state.timelineDate);
                    dt.setDate(dt.getDate() + 1);
                    state.timelineDate = localDateString(dt);
                    refreshTimelineHeader();
                    if (state.selectedChildId) {
                        loadSleepTimeline(state.selectedChildId).catch((error) => setCard("last-sleep", `Timeline error: ${error.message}`));
                    }
                });

                timelineDateInput.addEventListener("change", () => {
                    if (!timelineDateInput.value) {
                        return;
                    }
                    state.timelineDate = timelineDateInput.value;
                    refreshTimelineHeader();
                    if (state.selectedChildId) {
                        loadSleepTimeline(state.selectedChildId).catch((error) => setCard("last-sleep", `Timeline error: ${error.message}`));
                    }
                });
            }

            if (sleepTimerAction) {
                sleepTimerAction.addEventListener("click", async () => {
                    try {
                        sleepTimerAction.disabled = true;
                        if (state.timer.running) {
                            await stopSleepTimer();
                        } else {
                            await startSleepTimer();
                        }
                    } catch (error) {
                        if (sleepTimerNote) {
                            sleepTimerNote.textContent = `Timer error: ${error.message}`;
                        }
                    } finally {
                        sleepTimerAction.disabled = false;
                    }
                });
            }

            restoreTimerState();
            refreshCounts();
            refreshTimelineHeader();
            updateSleepTimerUI();
            if (state.timer.running) {
                startTimerTicking();
            }

            loadChildren()
                .then((children) => {
                    if (!children.length) {
                        return;
                    }

                    if (!childSelect.value) {
                        childSelect.value = String(children[0].id);
                    }

                    if (fixedChildId) {
                        childSelect.value = fixedChildId;
                    }

                    if (!fixedChildId && state.timer.running && state.timer.childId) {
                        childSelect.value = String(state.timer.childId);
                    }

                    if (!fixedChildId) {
                        localStorage.setItem(selectionKey, childSelect.value);
                    }
                    return loadCards(childSelect.value);
                })
                .catch((error) => {
                    if (fixedChildId && childSelect.options.length > 0) {
                        childSelect.value = fixedChildId;
                        loadCards(fixedChildId).catch((cardError) => {
                            Object.keys(cards).forEach((key) => setCard(key, `Error loading data: ${cardError.message}`));
                        });
                        return;
                    }
                    childSelect.innerHTML = '<option value="">Error loading children</option>';
                    Object.keys(cards).forEach((key) => setCard(key, `Error loading data: ${error.message}`));
                });

            document.addEventListener("scroll", hideTooltip, { passive: true });
            if (timelineWrap) {
                timelineWrap.addEventListener("mouseleave", hideTooltip);
            }
        })();
