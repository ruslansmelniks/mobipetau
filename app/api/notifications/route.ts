import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Notifications fetch error:', error)
      // Return empty array instead of error for new users or RLS issues
      if (error.code === '42501' || error.code === 'PGRST116') {
        return NextResponse.json({ 
          notifications: [], 
          unreadCount: 0 
        })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const unreadCount = notifications?.filter(n => !n.read).length || 0

    return NextResponse.json({ 
      notifications: notifications || [], 
      unreadCount 
    })
  } catch (error) {
    console.error('Notifications API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { notificationId, read } = await request.json()

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({ read })
      .eq('id', notificationId)
      .eq('user_id', user.id)
      .select()

    if (error) {
      console.error('Notification update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, notification: data?.[0] })
  } catch (error) {
    console.error('Notification update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 