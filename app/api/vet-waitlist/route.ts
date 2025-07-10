import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    console.log('Received vet waitlist submission:', body);

    // Validate required fields
    const requiredFields = ['fullName', 'email', 'phoneNumber', 'location', 'licenseNumber', 'yearsOfExperience'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Call the bypass function via REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/insert_vet_waitlist_bypass`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_full_name: body.fullName,
        p_email: body.email,
        p_phone_number: body.phoneNumber,
        p_location: body.location,
        p_license_number: body.licenseNumber,
        p_years_experience: parseInt(body.yearsOfExperience),
        p_specialties: body.specialties || [],
        p_bio: body.professionalBio || ''
      })
    });

    const responseText = await response.text();
    console.log('Supabase response status:', response.status);
    console.log('Supabase response:', responseText);

    if (!response.ok) {
      console.error('Error response:', responseText);
      return NextResponse.json(
        { error: 'Failed to submit application' },
        { status: response.status }
      );
    }

    // Parse the result
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response:', responseText);
      return NextResponse.json(
        { error: 'Invalid server response' },
        { status: 500 }
      );
    }

    // Check if the function returned success
    if (result && result.success === false) {
      return NextResponse.json(
        { error: result.error || 'Failed to add to waitlist' },
        { status: 400 }
      );
    }

    console.log('Successfully created waitlist entry:', result);

    return NextResponse.json(
      { 
        message: 'Successfully added to waitlist', 
        id: result.id || result.data?.id
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing vet waitlist submission:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process application', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 