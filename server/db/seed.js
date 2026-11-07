const bcrypt = require('bcryptjs');

async function seed() {
  const { get, run } = require('./index');

  const userCount = (await get('SELECT COUNT(*) AS c FROM users')).c;
  if (userCount === 0) {
    const groomers = [
      ['groomer1', 'ChangeMe123!', 'Groomer One', '#0d9488'],
      ['groomer2', 'ChangeMe123!', 'Groomer Two', '#64748b']
    ];
    for (const [username, password, name, color] of groomers) {
      const passwordHash = bcrypt.hashSync(password, 10);
      await run(
        'INSERT INTO users (username, password_hash, name, color) VALUES (?, ?, ?, ?)',
        [username, passwordHash, name, color]
      );
    }
    console.log('Seeded default groomer logins: groomer1 / ChangeMe123! and groomer2 / ChangeMe123!');
    console.log('Please log in and change these before real client data is entered.');
  }
}

module.exports = seed;
