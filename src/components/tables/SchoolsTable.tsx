import { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
  X,
  Upload
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuRadioGroup, 
  DropdownMenuRadioItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { useSchools, useDeleteSchool, useUpdateSchoolStatus } from '@/hooks/useSchools';
import { School, SchoolStatus } from '@/types/school';
import { useNavigate } from 'react-router-dom';

const ITEMS_PER_PAGE = 10;

interface SchoolsTableProps {
  onAddSchool?: () => void;
  onViewSchool?: (id: string) => void;
  onEditSchool?: (id: string) => void;
}

export function SchoolsTable({ onAddSchool, onViewSchool, onEditSchool }: SchoolsTableProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SchoolStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search term to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch schools with pagination and filtering
  const { data, isLoading, isFetching, isError, error } = useSchools({
    search: debouncedSearchTerm,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    sortBy: 'name',
    sortOrder: 'asc'
  });
  
  const deleteSchool = useDeleteSchool();
  const updateStatus = useUpdateSchoolStatus();
  
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this school? This action cannot be undone.')) {
      try {
        await deleteSchool.mutateAsync(id);
        toast({
          title: 'Success',
          description: 'School deleted successfully',
          variant: 'default'
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete school',
          variant: 'destructive'
        });
      }
    }
  };
  
  const handleStatusToggle = async (id: string, currentStatus: SchoolStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await updateStatus.mutateAsync({ id, status: newStatus });
      toast({
        title: 'Success',
        description: `School marked as ${newStatus}`,
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update school status',
        variant: 'destructive'
      });
    }
  };
  
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo(0, 0);
  };
  
  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCurrentPage(1);
  };
  
  const hasFilters = searchTerm || statusFilter !== 'all';
  
  if (isLoading && !data) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (isError) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-destructive">
            Error loading schools: {error?.message || 'Unknown error occurred'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Schools Directory</CardTitle>
            <CardDescription className="mt-1">
              Manage all schools in the system
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/schools/bulk-upload')}>
              <Upload className="h-4 w-4 mr-2" />
              Bulk Upload
            </Button>
            <Button onClick={onAddSchool}>
              <Plus className="h-4 w-4 mr-2" />
              Add School
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
          <div className="relative flex-1 max-w-md">
            {isFetching ? (
              <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            )}
            <Input
              placeholder="Search by name, location, or pincode..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto justify-start">
                <Filter className="h-4 w-4 mr-2" />
                Status: {statusFilter === 'all' ? 'All' : statusFilter === 'active' ? 'Active' : 'Inactive'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup 
                value={statusFilter} 
                onValueChange={(value) => {
                  setStatusFilter(value as SchoolStatus | 'all');
                  setCurrentPage(1);
                }}
              >
                <DropdownMenuRadioItem value="all">All Schools</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="active">Active</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="inactive">Inactive</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {hasFilters && (
            <Button 
              variant="ghost" 
              onClick={handleClearFilters}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear filters
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border relative">
          {isFetching && data && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 pointer-events-none" />
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">School Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="w-[100px]">Pincode</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[150px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data && data.data.length > 0 ? (
                data.data.map((school) => (
                  <TableRow key={school.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="font-medium">{school.name}</span>
                        <span className="text-xs text-muted-foreground">{school.code}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{school.address.street}</div>
                        <div className="text-muted-foreground">
                          {school.address.city}, {school.address.state} {school.address.postalCode}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{school.contact.phone}</div>
                        <div className="text-muted-foreground truncate max-w-[200px]">
                          {school.contact.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{school.address.postalCode}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div className={`h-2 w-2 rounded-full mr-2 ${
                          school.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <span className="capitalize">{school.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onViewSchool?.(school.id)}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View </span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditSchool?.(school.id)}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStatusToggle(school.id, school.status)}
                          disabled={updateStatus.isPending}
                        >
                          {updateStatus.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : school.status === 'active' ? (
                            <span className="text-yellow-500">✕</span>
                          ) : (
                            <span className="text-green-500">✓</span>
                          )}
                          <span className="sr-only">
                            {school.status === 'active' ? 'Deactivate' : 'Activate'}
                          </span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(school.id)}
                          disabled={deleteSchool.isPending}
                          className="text-destructive hover:text-destructive/80"
                        >
                          {deleteSchool.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="text-muted-foreground">
                      {hasFilters ? (
                        <div className="flex flex-col items-center space-y-2">
                          <p>No schools match your filters</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearFilters}
                          >
                            Clear filters
                          </Button>
                        </div>
                      ) : (
                        'No schools found. Add your first school to get started.'
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-2 py-4">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(currentPage * ITEMS_PER_PAGE, data.count || 0)}
              </span>{' '}
              of <span className="font-medium">{data.count}</span> schools
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isFetching}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === data.totalPages || isFetching}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}