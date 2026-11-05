// Same-origin admin ajax requests must carry the synchronizer token.
$(function () {
  const token = $('meta[name="csrf-token"]').attr('content');
  $.ajaxSetup({ headers: { 'X-CSRF-Token': token } });
});

$(function () {
  $('form[enctype="multipart/form-data"]').on('submit', async function (event) {
    if (event.isDefaultPrevented()) return;
    event.preventDefault();
    const button = $(this).find('[type="submit"]');
    button.prop('disabled', true);
    try {
      const response = await fetch(this.action, { method: 'POST', credentials: 'same-origin',
        headers: { 'X-CSRF-Token': $('meta[name="csrf-token"]').attr('content'), 'Accept': 'application/json' },
        body: new FormData(this) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to upload images.');
      window.location.assign('/admin/product/all');
    } catch (error) { alert(error.message); }
    finally { button.prop('disabled', false); }
  });
});
