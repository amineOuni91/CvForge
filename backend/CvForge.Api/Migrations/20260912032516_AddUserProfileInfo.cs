using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CvForge.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUserProfileInfo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ProfileInfo",
                table: "AspNetUsers",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "{}");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProfileInfo",
                table: "AspNetUsers");
        }
    }
}
