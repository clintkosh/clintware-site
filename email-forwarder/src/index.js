export default {
  async email(message) {
    await message.forward("clint.kosh@gmail.com");
  },
};
