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
    const { notificationId, read, action, notificationIds } = await request.json()
    if (!notificationId && !notificationIds) {
      return NextResponse.json({ error: 'Notification ID(s) is required' }, { status: 400 })
    }
    // Support both single and bulk update
    const ids = notificationIds || (notificationId ? [notificationId] : [])
    if (action === 'mark_read' || action === 'mark_seen' || read === true) {
      // Mark as read/seen using only is_read and read columns
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read: true })
        .eq('user_id', user.id)
        .in('id', ids)
      if (error) {
        console.error('Error updating notifications:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    } else {
      // Fallback: update read column if provided
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
    }
  } catch (error) {
    console.error('Notification update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 