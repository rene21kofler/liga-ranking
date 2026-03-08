export interface Database {
  public: {
    Tables: {
      leagues: {
        Row: {
          id: string
          name: string
          country_code: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          country_code: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          country_code?: string
          created_by?: string
          created_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          id: string
          league_id: string
          name: string
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          league_id: string
          name: string
          position: number
          created_at?: string
        }
        Update: {
          id?: string
          league_id?: string
          name?: string
          position?: number
          created_at?: string
        }
        Relationships: []
      }
      vote_tokens: {
        Row: {
          id: string
          token: string
          league_id: string
          league_name: string
          email: string
          ranking: VoteRankingEntry[]
          confirmed_at: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          token?: string
          league_id: string
          league_name: string
          email: string
          ranking: VoteRankingEntry[]
          confirmed_at?: string | null
          expires_at?: string
          created_at?: string
        }
        Update: {
          confirmed_at?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type League = Database['public']['Tables']['leagues']['Row']
export type Team = Database['public']['Tables']['teams']['Row']

export interface VoteRankingEntry {
  team_id: string
  team_name: string
  position: number
}

export interface VoteToken {
  id: string
  token: string
  league_id: string
  league_name: string
  email: string
  ranking: VoteRankingEntry[]
  confirmed_at: string | null
  created_at: string
  expires_at: string
}
