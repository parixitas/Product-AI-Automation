using DiamondsChatBoadApi.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace DiamondsChatBoadApi.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }
        public DbSet<Product> product => Set<Product>();
    }
}
