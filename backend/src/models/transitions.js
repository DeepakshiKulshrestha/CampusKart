// Shared helper: remember the status loaded from the DB and reject illegal status changes on save.
export function enforceTransitions(schema, field, transitions, label) {
  schema.post('init', function () {
    this.$locals.prev = this[field];
  });
  schema.pre('validate', function () {
    if (this.isNew || !this.isModified(field)) return;
    const from = this.$locals.prev;
    const to = this[field];
    if (!(transitions[from] || []).includes(to)) this.invalidate(field, `${label} cannot change from ${from} to ${to}`);
  });
}
