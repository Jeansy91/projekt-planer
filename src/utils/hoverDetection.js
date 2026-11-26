/**
 * Detect which team/lane/staging row the cursor is hovering over.
 * Pure function: takes DOM container + mouse coordinates, returns data.
 * @param {HTMLElement} containerEl - the main scroll container
 * @param {number} clientX - mouse X
 * @param {number} clientY - mouse Y
 * @param {string[]} draggingIds - IDs of tasks currently being dragged
 * @returns {{ teamId, insertIndex, laneId, stagingInsertIndex }}
 */
export const detectHoverTarget = (containerEl, clientX, clientY, draggingIds) => {
  let teamId = null;
  let insertIndex = 0;
  let laneId = null;
  let stagingInsertIndex = null;

  try {
    const groupEls = Array.from(containerEl.querySelectorAll('[data-team-id]'));

    // Find the team group under the cursor
    let targetTeamEl = null;
    for (const el of groupEls) {
      const rect = el.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        targetTeamEl = el;
        break;
      }
    }

    // Fallback: snap to closest team
    if (!targetTeamEl && groupEls.length > 0) {
      let closest = groupEls[0];
      let minDist = Math.abs(clientY - closest.getBoundingClientRect().top);
      for (let i = 1; i < groupEls.length; i++) {
        const dist = Math.abs(clientY - groupEls[i].getBoundingClientRect().top);
        if (dist < minDist) { minDist = dist; closest = groupEls[i]; }
      }
      targetTeamEl = closest;
    }

    teamId = targetTeamEl
      ? (targetTeamEl.getAttribute('data-team-id') === 'null' ? null : targetTeamEl.getAttribute('data-team-id'))
      : null;

    if (targetTeamEl) {
      // Vertical insert position among non-dragged tasks
      const teamRect = targetTeamEl.getBoundingClientRect();
      const nodes = Array.from(targetTeamEl.querySelectorAll('[data-task-id]')).filter(el => {
        const nodeId = el.getAttribute('data-task-id');
        return !draggingIds.includes(Number(nodeId)) && !draggingIds.includes(nodeId);
      });
      if (nodes.length === 0) {
        insertIndex = 0;
      } else {
        const relativeY = clientY - teamRect.top;
        let idx = 0;
        for (let i = 0; i < nodes.length; i++) {
          const r = nodes[i].getBoundingClientRect();
          const mid = r.top + r.height / 2 - teamRect.top;
          if (relativeY > mid) idx = i + 1;
        }
        insertIndex = Math.max(0, Math.min(nodes.length, idx));
      }

      // Detect lane hover
      const laneEls = Array.from(targetTeamEl.querySelectorAll('[data-lane-id]'));
      for (const laneEl of laneEls) {
        const rect = laneEl.getBoundingClientRect();
        if (clientY >= rect.top && clientY <= rect.bottom) {
          laneId = laneEl.getAttribute('data-lane-id');
          break;
        }
      }

      // Detect staging row hover for horizontal reorder
      const stagingRowEl = targetTeamEl.querySelector('[data-staging-row]');
      if (stagingRowEl) {
        const sr = stagingRowEl.getBoundingClientRect();
        if (clientY >= sr.top && clientY <= sr.bottom) {
          const taskEls = Array.from(stagingRowEl.querySelectorAll('[data-task-id]'))
            .filter(el => !draggingIds.includes(Number(el.getAttribute('data-task-id'))) && !draggingIds.includes(el.getAttribute('data-task-id')));
          stagingInsertIndex = 0;
          for (const el of taskEls) {
            const r = el.getBoundingClientRect();
            if (clientX > r.left + r.width / 2) stagingInsertIndex++;
          }
        }
      }
    }
  } catch (err) { /* ignore DOM errors */ }

  return { teamId, insertIndex, laneId, stagingInsertIndex };
};
