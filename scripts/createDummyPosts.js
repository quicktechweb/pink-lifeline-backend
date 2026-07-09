import axios from 'axios';
import FormData from 'form-data';

const USER_ID = 'USR-XT90BI';

// Extended data for variety
const topics = [
  'Healthcare Innovation',
  'Community Engagement',
  'Patient Advocacy',
  'Clinical Best Practices',
];

const getDummyDescription = (index) => {
  const base = `This is post number ${index + 1}. In the evolving landscape of modern healthcare, we are seeing significant shifts in how community platforms interact with patient data and clinical workflows. Our team at Quicktech IT has been focusing on streamlining these processes to ensure that every stakeholder—from practitioners to administrators—has seamless access to critical information. 

  Data integrity remains our top priority, particularly when managing complex taxonomies and user-generated content. As we scale our architecture, we continue to refine the backend logic to support high-concurrency requests while maintaining a user-friendly frontend experience. This specific update is part of our broader initiative to mirror the robust structures found in major regional platforms, ensuring scalability and reliability. We believe that by integrating sandbox testing and rigorous validation, we can mitigate risks and improve the overall lifecycle of our applications. As we move forward, we are committed to maintaining the highest standards of development, ensuring that our projects like the ones we've managed for retail and tutoring marketplaces remain stable and efficient for all users.`;

  return base;
};

async function sendPost(i) {
  const url = `http://localhost:5000/api/community/v1/create-post/${USER_ID}`;
  const form = new FormData();

  const title = `${topics[i % topics.length]} - Update #${i + 1}`;
  const description = getDummyDescription(i);

  form.append('title', title);
  form.append('description', description);
  form.append(
    'hashtags',
    JSON.stringify(['tech', 'development', 'community', 'professional'])
  );

  try {
    const response = await axios.post(url, form, {
      headers: { ...form.getHeaders() },
    });
    console.log(`[${i + 1}/200] Successfully posted: ${title}`);
  } catch (error) {
    console.error(`[${i + 1}/200] Failed to post: ${title}`, error.message);
  }
}

async function runBatch() {
  for (let i = 0; i < 200; i++) {
    await sendPost(i);
    // 300ms delay to keep local server stable
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  console.log('Batch processing complete.');
}

runBatch();
