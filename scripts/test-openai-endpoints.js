


async function testEndpoints() {
  const baseUrl = 'http://localhost:3000/api';
  
  // Test Quiz Generation
  console.log('Testing Quiz Generation...');
  try {
    const res = await fetch(`${baseUrl}/generate-quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to create oxygen and energy in the form of sugar.',
        count: 1,
        difficulty: 'Easy',
        topics: 'Biology'
      })
    });
    const data = await res.json();
    if (data.questions && data.questions.length > 0) {
      console.log('✅ Quiz Generation Passed');
    } else {
      console.error('❌ Quiz Generation Failed', data);
    }
  } catch (e) {
    console.error('❌ Quiz Generation Error', e.message);
  }

  // Test Chat
  console.log('\nTesting Chat...');
  try {
    const res = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello, how does photosynthesis work?' }]
      })
    });
    const data = await res.json();
    if (data.message) {
      console.log('✅ Chat Passed');
    } else {
      console.error('❌ Chat Failed', data);
    }
  } catch (e) {
    console.error('❌ Chat Error', e.message);
  }

  // Test Matching
  console.log('\nTesting Matching...');
  try {
    const res = await fetch(`${baseUrl}/generate-matching`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'The mitochondrion is the powerhouse of the cell. The nucleus contains genetic material.',
        count: 2,
        difficulty: 'Medium',
        topics: 'Cell Biology'
      })
    });
    const data = await res.json();
    if (data.pairs && data.pairs.length > 0) {
      console.log('✅ Matching Passed');
    } else {
      console.error('❌ Matching Failed', data);
    }
  } catch (e) {
    console.error('❌ Matching Error', e.message);
  }

  // Test Flashcards
  console.log('\nTesting Flashcards...');
  try {
    const res = await fetch(`${baseUrl}/generate-flashcards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Newton\'s first law states that an object in motion stays in motion.',
        count: 1,
        difficulty: 'Easy',
        topics: 'Physics'
      })
    });
    const data = await res.json();
    if (data.flashcards && data.flashcards.length > 0) {
      console.log('✅ Flashcards Passed');
    } else {
      console.error('❌ Flashcards Failed', data);
    }
  } catch (e) {
    console.error('❌ Flashcards Error', e.message);
  }
}

testEndpoints();
