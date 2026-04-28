import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const updates = await request.json();

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Updates object is required' }, { status: 400 });
    }

    // Build dynamic update query
    const updateFields = Object.keys(updates);
    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const setClause = updateFields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const values = updateFields.map(field => {
      // Handle special cases
      if (field === 'started_at' && updates[field] === true) {
        return new Date().toISOString();
      }
      if (field === 'completed_at' && updates[field] === true) {
        return new Date().toISOString();
      }
      return updates[field];
    });
    values.unshift(id); // id is $1

    const query = `UPDATE matches SET ${setClause} WHERE id = $1 RETURNING *`;
    const result = await sql.unsafe(query, values);

    if (result.length === 0) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    return NextResponse.json({ match: result[0] });
  } catch (error) {
    console.error('Error updating match:', error);
    return NextResponse.json({ error: 'Failed to update match' }, { status: 500 });
  }
}