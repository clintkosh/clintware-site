const TARGET = "https://koalendar.com/e/meet-with-clinton";

export default {
  async fetch() {
    return Response.redirect(TARGET, 302);
  },
};
