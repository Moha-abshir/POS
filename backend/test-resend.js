const { Resend } = require('resend');

const resend = new Resend('re_c5aXgo1V_MSSF7ZbpuYvwwsvAtoFabbK4');

async function test() {
  try {
    const data = await resend.emails.send({
      from: 'Hardware Store <onboarding@resend.dev>',
      to: 'owner@store.com',
      subject: 'Test',
      html: '<p>Test</p>'
    });
    console.log('Success:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
