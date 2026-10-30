/**
 * filter_resources()
 * ------------------
 * Show resource cards matching the selected category and mark the active filter button.
 *
 * Parameters:
 * -----------
 * category: string — A resource category, or all to show every card.
 * active_button: HTMLButtonElement — The category control selected by the user.
 *
 * Returns:
 * --------
 * void
 */
function filter_resources(category, active_button) {
  document.querySelectorAll('.filter-btn').forEach((button) => {
    button.classList.toggle('active', button === active_button);
  });
  document.querySelectorAll('.resource-card').forEach((card) => {
    card.hidden = category !== 'all' && card.dataset.category !== category;
  });
}

/**
 * initialize_resource_filters()
 * -----------------------------
 * Bind category filter buttons to the shared resource-card filtering behavior.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function initialize_resource_filters() {
  document.querySelectorAll('.filter-btn').forEach((button) => {
    button.addEventListener('click', () => filter_resources(button.dataset.category, button));
  });
}

initialize_resource_filters();
