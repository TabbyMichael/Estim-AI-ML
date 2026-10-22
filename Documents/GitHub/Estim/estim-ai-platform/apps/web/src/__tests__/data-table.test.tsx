import { fireEvent, render, screen, within } from '@testing-library/react'
import { DataTable, type Column } from '@/components/ui/data-table'

type Row = { id: string; name: string; score: number }

const rows: Row[] = [
  { id: '3', name: 'Gamma', score: 40 },
  { id: '1', name: 'Alpha', score: 90 },
  { id: '2', name: 'Beta', score: 70 },
]

const columns: Column<Row>[] = [
  { id: 'name', header: 'Name', cell: (row) => row.name, sortValue: (row) => row.name },
  {
    id: 'score',
    header: 'Score',
    cell: (row) => row.score,
    sortValue: (row) => row.score,
    align: 'right',
  },
]

const getRowId = (row: Row) => row.id

function firstColumnValues() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent)
}

describe('DataTable', () => {
  it('renders a caption, headers and rows', () => {
    render(<DataTable data={rows} columns={columns} getRowId={getRowId} caption="Projects" />)

    expect(screen.getByRole('table', { name: 'Projects' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
    expect(screen.getByText('Gamma')).toBeInTheDocument()
    expect(firstColumnValues()).toHaveLength(3)
  })

  it('shows the empty state when there are no rows', () => {
    render(
      <DataTable
        data={[]}
        columns={columns}
        getRowId={getRowId}
        emptyTitle="No projects"
        emptyDescription="Create a project to get started."
      />,
    )

    expect(screen.getByText('No projects')).toBeInTheDocument()
    expect(screen.getByText('Create a project to get started.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows an error state with a retry action', () => {
    const onRetry = jest.fn()
    render(
      <DataTable
        data={[]}
        columns={columns}
        getRowId={getRowId}
        error="Request failed"
        onRetry={onRetry}
      />,
    )

    expect(screen.getByText('Request failed')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('cycles sorting ascending, descending and unsorted', () => {
    render(<DataTable data={rows} columns={columns} getRowId={getRowId} />)

    const nameHeader = screen.getByRole('columnheader', { name: /name/i })
    expect(nameHeader).toHaveAttribute('aria-sort', 'none')

    fireEvent.click(within(nameHeader).getByRole('button'))
    expect(firstColumnValues()).toEqual(['Alpha', 'Beta', 'Gamma'])
    expect(screen.getByRole('columnheader', { name: /name/i })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )

    fireEvent.click(within(screen.getByRole('columnheader', { name: /name/i })).getByRole('button'))
    expect(firstColumnValues()).toEqual(['Gamma', 'Beta', 'Alpha'])
    expect(screen.getByRole('columnheader', { name: /name/i })).toHaveAttribute(
      'aria-sort',
      'descending',
    )

    fireEvent.click(within(screen.getByRole('columnheader', { name: /name/i })).getByRole('button'))
    expect(firstColumnValues()).toEqual(['Gamma', 'Alpha', 'Beta'])
    expect(screen.getByRole('columnheader', { name: /name/i })).toHaveAttribute('aria-sort', 'none')
  })

  it('paginates and reports the visible range', () => {
    render(<DataTable data={rows} columns={columns} getRowId={getRowId} pageSize={2} />)

    expect(screen.getByText('1–2 of 3')).toBeInTheDocument()
    expect(firstColumnValues()).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('3–3 of 3')).toBeInTheDocument()
    expect(firstColumnValues()).toEqual(['Beta'])

    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }))
    expect(screen.getByText('1–2 of 3')).toBeInTheDocument()
  })

  it('activates row clicks with pointer and keyboard input', () => {
    const onRowClick = jest.fn()
    render(
      <DataTable data={rows} columns={columns} getRowId={getRowId} onRowClick={onRowClick} />,
    )

    const row = screen.getByText('Gamma').closest('tr')
    expect(row).not.toBeNull()

    fireEvent.click(row!)
    expect(onRowClick).toHaveBeenCalledWith(rows[0])

    fireEvent.keyDown(row!, { key: 'Enter' })
    expect(onRowClick).toHaveBeenCalledTimes(2)
  })
})
